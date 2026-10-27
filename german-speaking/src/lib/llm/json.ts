import type { z } from "zod";
import { extractJson } from "../text";

export type JsonAttempt = (feedback: string | undefined) => Promise<unknown>;

/**
 * Run `attempt` until its output validates against `schema`.
 * The attempt receives a description of the previous failure so the model can fix it.
 * Attempts may return already-parsed objects or raw text (JSON is extracted from text).
 */
export async function withJsonRetries<T>(attempt: JsonAttempt, schema: z.ZodType<T>, maxAttempts = 3): Promise<T> {
  let feedback: string | undefined;
  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const out = await attempt(feedback);
      const value = typeof out === "string" ? extractJson(out) : out;
      const parsed = schema.safeParse(value);
      if (parsed.success) return parsed.data;
      lastError = parsed.error;
      feedback = `The JSON did not match the schema: ${parsed.error.issues
        .slice(0, 8)
        .map((iss) => `${iss.path.join(".") || "(root)"}: ${iss.message}`)
        .join("; ")}`;
    } catch (err) {
      lastError = err;
      feedback = `Your previous output was not valid JSON (${err instanceof Error ? err.message : String(err)}).`;
      if (isNonRetryable(err)) throw err;
    }
  }
  throw new Error(`Invalid JSON from model after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function isNonRetryable(err: unknown): boolean {
  return err instanceof Error && (err.name === "LLMRefusalError" || err.name === "AuthenticationError" || err.name === "PermissionDeniedError");
}
