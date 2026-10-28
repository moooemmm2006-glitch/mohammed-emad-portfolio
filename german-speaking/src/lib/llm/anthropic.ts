import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { withJsonRetries } from "./json";
import { LLMRefusalError, type ChatParams, type JsonParams, type LLM } from "./types";

// Haiku writes the reading texts: thinking off keeps latency low and keeps max_tokens a real cap.
// Other models always think, so they get headroom.
function thinkingFor(model: string, maxTokens: number) {
  if (/haiku/i.test(model)) {
    return { thinking: { type: "disabled" as const }, max_tokens: maxTokens };
  }
  return { max_tokens: maxTokens + 2048 };
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

export class AnthropicLLM implements LLM {
  provider = "anthropic" as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 2 });
  }

  async chat(p: ChatParams): Promise<string> {
    const stream = this.client.messages.stream(
      {
        model: p.model,
        ...thinkingFor(p.model, p.maxTokens),
        system: p.system,
        messages: p.messages,
        output_config: { effort: "low" },
      },
      { signal: p.signal },
    );
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") throw new LLMRefusalError();
    return textOf(final);
  }

  async json<T>(p: JsonParams<T>): Promise<T> {
    // First try native structured outputs; if the API rejects the schema (400), fall back to
    // "JSON only" prompting. Either way the result is validated with zod and retried on failure.
    let structured = true;
    return withJsonRetries<T>(async (feedback) => {
      const content = feedback ? `${p.prompt}\n\n${feedback} Return corrected JSON only.` : p.prompt;
      const base = {
        model: p.model,
        ...thinkingFor(p.model, p.maxTokens),
        messages: [{ role: "user" as const, content }],
      };
      if (structured) {
        try {
          const msg = await this.client.messages.parse({
            ...base,
            system: p.system,
            output_config: { format: zodOutputFormat(p.schema as z.ZodType), effort: p.effort ?? "low" },
          });
          if (msg.stop_reason === "refusal") throw new LLMRefusalError();
          return msg.parsed_output ?? textOf(msg);
        } catch (err) {
          if (err instanceof Anthropic.BadRequestError) {
            structured = false;
          } else {
            throw err;
          }
        }
      }
      const schemaText = JSON.stringify(z.toJSONSchema(p.schema as z.ZodType));
      const msg = await this.client.messages.create({
        ...base,
        system: `${p.system}\n\nReturn ONLY one JSON object, no prose, matching this JSON Schema:\n${schemaText}`,
        output_config: { effort: p.effort ?? "low" },
      });
      if (msg.stop_reason === "refusal") throw new LLMRefusalError();
      return textOf(msg);
    }, p.schema);
  }
}
