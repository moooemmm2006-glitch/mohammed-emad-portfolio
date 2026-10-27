import type { z } from "zod";
import type { Level } from "../levels";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatPurpose = "partner" | "simplify" | "summary";
export type JsonPurpose = "check" | "report" | "hint";

export interface ChatParams {
  model: string;
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  purpose: ChatPurpose;
  level?: Level;
  onText?: (delta: string) => void;
  signal?: AbortSignal;
}

export interface JsonParams<T> {
  model: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  purpose: JsonPurpose;
  effort?: "low" | "medium" | "high";
  /** Structured input the mock provider uses to build a believable answer without a model. */
  mockContext?: unknown;
}

export interface LLM {
  provider: "anthropic" | "mock";
  chat(p: ChatParams): Promise<string>;
  json<T>(p: JsonParams<T>): Promise<T>;
}

export class LLMRefusalError extends Error {
  constructor(message = "The model declined to answer") {
    super(message);
    this.name = "LLMRefusalError";
  }
}
