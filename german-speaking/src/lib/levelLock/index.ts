// Level-locking wrapper around the conversation partner.
//
//   draft ──► heuristic check ──► LLM checker ──► ok? ──► reply
//     ▲            │ fail              │ fail
//     └── regenerate with the violations fed back (max `maxRetries` times)
//   after the last retry: checker's simplified version → explicit simplify call →
//   salvage the sentences that pass → canned level-safe line.
//
// The model calls are injected so the logic can be unit-tested without an API key.

import { z } from "zod";
import { LEVEL_CONFIG, type Level } from "../levels";
import { regenerationFeedback } from "../prompts";
import { heuristicCheck, salvageSentences, type Violation } from "./heuristics";

export { heuristicCheck, salvageSentences, type Violation } from "./heuristics";

export const CheckSchema = z.object({
  ok: z.boolean(),
  violations: z.array(z.object({ excerpt: z.string(), rule: z.string() })),
  simplified: z.string().nullable(),
});
export type CheckResult = z.infer<typeof CheckSchema>;

export type LockStatus = "generating" | "checking" | "retrying" | "fallback";
export type FallbackKind = "none" | "checker_simplified" | "simplified" | "salvaged" | "canned";

export interface LevelLockDeps {
  /** Generate a reply. `feedback` is extra system text describing previous violations (null on the first try). */
  generate(feedback: string | null): Promise<string>;
  /** Second-pass LLM validation. */
  check(text: string): Promise<CheckResult>;
  /** Rewrite text at the level (used only as a fallback). */
  simplify(text: string): Promise<string>;
}

export interface LevelLockOptions {
  level: Level;
  maxRetries?: number;
  onStatus?: (s: LockStatus) => void;
  onViolation?: (attempt: number, violations: Violation[]) => void;
  random?: () => number;
}

export interface LevelLockResult {
  text: string;
  attempts: number;
  fallback: FallbackKind;
  violations: Violation[][];
}

export async function levelLockedReply(deps: LevelLockDeps, opts: LevelLockOptions): Promise<LevelLockResult> {
  const { level, maxRetries = 2, onStatus, onViolation } = opts;
  const history: Violation[][] = [];
  let feedback: string | null = null;
  let lastDraft = "";
  let checkerSimplified: string | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts++;
    onStatus?.(attempt === 0 ? "generating" : "retrying");
    const draft = (await deps.generate(feedback)).trim();
    lastDraft = draft;

    const h = heuristicCheck(level, draft);
    if (!h.ok) {
      history.push(h.violations);
      onViolation?.(attempt, h.violations);
      feedback = regenerationFeedback(level, h.violations);
      continue;
    }

    onStatus?.("checking");
    let check: CheckResult;
    try {
      check = await deps.check(draft);
    } catch {
      // The checker is a safety net; if it is unavailable the heuristics already passed.
      return { text: draft, attempts, fallback: "none", violations: history };
    }
    if (check.ok || check.violations.length === 0) {
      return { text: draft, attempts, fallback: "none", violations: history };
    }
    const vs: Violation[] = check.violations.map((v) => ({ ...v, source: "llm" }));
    history.push(vs);
    onViolation?.(attempt, vs);
    checkerSimplified = check.simplified;
    feedback = regenerationFeedback(level, vs);
  }

  onStatus?.("fallback");
  if (checkerSimplified && heuristicCheck(level, checkerSimplified).ok) {
    return { text: checkerSimplified.trim(), attempts, fallback: "checker_simplified", violations: history };
  }
  try {
    const simplified = (await deps.simplify(lastDraft)).trim();
    if (simplified && heuristicCheck(level, simplified).ok) {
      return { text: simplified, attempts, fallback: "simplified", violations: history };
    }
  } catch {
    // fall through to salvage
  }
  const salvaged = salvageSentences(level, lastDraft);
  if (salvaged) return { text: salvaged, attempts, fallback: "salvaged", violations: history };

  const pool = LEVEL_CONFIG[level].safeFallbacks;
  const pick = pool[Math.floor((opts.random ?? Math.random)() * pool.length)] ?? pool[0];
  return { text: pick, attempts, fallback: "canned", violations: history };
}

/** Fast mode: the reply was already streamed; validate afterwards so the next turn can be steered. */
export async function checkAfterTheFact(
  level: Level,
  text: string,
  check: (t: string) => Promise<CheckResult>,
): Promise<Violation[]> {
  const h = heuristicCheck(level, text);
  if (!h.ok) return h.violations;
  try {
    const c = await check(text);
    return c.ok ? [] : c.violations.map((v) => ({ ...v, source: "llm" as const }));
  } catch {
    return [];
  }
}
