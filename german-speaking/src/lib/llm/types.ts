import type { z } from "zod";
import type { Level } from "../levels";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatPurpose = "reading";
export type JsonPurpose = "corrections";

export interface ChatParams {
  model: string;
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  purpose: ChatPurpose;
  level?: Level;
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
}

export interface LLM {
  provider: "anthropic";
  chat(p: ChatParams): Promise<string>;
  json<T>(p: JsonParams<T>): Promise<T>;
}

export class LLMRefusalError extends Error {
  constructor(message = "The model declined to answer") {
    super(message);
    this.name = "LLMRefusalError";
  }
}
