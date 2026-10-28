import { serverConfig } from "../config";
import { AnthropicLLM } from "./anthropic";
import type { LLM } from "./types";

let cached: { key: string; llm: LLM } | null = null;

/** The AI (Claude) for reading texts and free-writing corrections; null without an API key. */
export function getLLM(): LLM | null {
  const cfg = serverConfig();
  if (cfg.llmProvider !== "anthropic") return null;
  const key = process.env.ANTHROPIC_API_KEY!;
  if (cached?.key === key) return cached.llm;
  const llm = new AnthropicLLM(key);
  cached = { key, llm };
  return llm;
}

export * from "./types";
