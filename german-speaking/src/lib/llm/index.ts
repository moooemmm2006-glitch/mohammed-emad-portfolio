import { serverConfig } from "../config";
import { AnthropicLLM } from "./anthropic";
import { MockLLM } from "./mock";
import type { LLM } from "./types";

let cached: { key: string; llm: LLM } | null = null;

export function getLLM(): LLM {
  const cfg = serverConfig();
  const key = `${cfg.llmProvider}:${process.env.ANTHROPIC_API_KEY ?? ""}`;
  if (cached?.key === key) return cached.llm;
  const llm = cfg.llmProvider === "anthropic" ? new AnthropicLLM(process.env.ANTHROPIC_API_KEY!) : new MockLLM();
  cached = { key, llm };
  return llm;
}

export * from "./types";
