// Level-locking wrapper around the conversation partner, built for low latency.
//
//   streamed reply ──► split into sentences ──► per sentence (in parallel):
//                          heuristic check ──► LLM checker (strict mode) ──► ok? emit
//                                │ fail                │ fail
//                                └──► regenerate ONLY that sentence ──► still bad? drop it
//
// Sentences are emitted strictly in order, so the browser can start speaking the first one
// while later ones are still being generated and checked. Model calls are injected so the
// logic is unit-testable without an API key.

import { z } from "zod";
import type { Intent } from "../intent";
import { LEVEL_CONFIG, type Level } from "../levels";
import { SentenceBuffer } from "../text";
import { heuristicCheck, maxSentencesFor, normalizeSentence, sentenceCheck, type Violation } from "./heuristics";

export { heuristicCheck, sentenceCheck, stripArabicHints, normalizeSentence, maxSentencesFor, type Violation } from "./heuristics";

export const CheckSchema = z.object({
  ok: z.boolean(),
  violations: z.array(z.object({ excerpt: z.string(), rule: z.string() })),
  simplified: z.string().nullable(),
});
export type CheckResult = z.infer<typeof CheckSchema>;

export type LockStatus = "generating" | "checking" | "retrying" | "fallback";

export interface StreamLockDeps {
  /** Stream the reply, calling onText with each text delta. */
  generate(onText: (delta: string) => void, signal: AbortSignal): Promise<string>;
  /** Second-pass LLM validation of ONE sentence; `before` = the reply's earlier sentences (context only). */
  check(sentence: string, before: string[]): Promise<CheckResult>;
  /** Rewrite ONE sentence at the level. */
  fixSentence(sentence: string, before: string[], violations: Violation[]): Promise<string>;
}

export interface StreamLockOptions {
  level: Level;
  intent?: Intent;
  /** "strict": LLM-check each sentence before it is spoken; "fast": heuristics only (LLM check runs afterwards). */
  mode?: "strict" | "fast";
  /** Sentences the partner already said in this conversation. */
  previous?: string[];
  onSentence: (text: string) => void;
  onViolation?: (index: number, violations: Violation[]) => void;
  random?: () => number;
}

export interface StreamLockResult {
  text: string;
  sentences: string[];
  fixed: number;
  dropped: number;
  truncated: boolean;
  fallback: boolean;
  violations: Violation[][];
}

export const FOLLOW_UPS: Record<Level, string[]> = {
  A1: ["Und du?", "Was meinst du?"],
  A2: ["Und wie ist das bei dir?", "Was meinst du?"],
  B1: ["Wie siehst du das?", "Was denkst du darüber?"],
  B2: ["Wie sehen Sie das?", "Was meinen Sie dazu?"],
};

export async function streamLevelLocked(deps: StreamLockDeps, opts: StreamLockOptions): Promise<StreamLockResult> {
  const { level, intent = "chat", mode = "strict" } = opts;
  const max = maxSentencesFor(level, intent);
  const previous = new Set((opts.previous ?? []).map(normalizeSentence));
  const ctrl = new AbortController();
  const buf = new SentenceBuffer();
  const raw: string[] = [];
  const queue: Promise<string | null>[] = [];
  const violations: Violation[][] = [];
  let fixed = 0;
  let dropped = 0;
  let truncated = false;
  let genDone = false;
  let genError: unknown = null;
  let wake: (() => void) | null = null;

  const processSentence = async (s: string, i: number): Promise<string | null> => {
    const before = raw.slice(0, i);
    // No repeats: neither earlier turns nor earlier sentences of this reply.
    const seen = new Set([...previous, ...before.map(normalizeSentence)]);
    const h = sentenceCheck(level, s, { intent, previous: seen });
    let found: Violation[] = h.violations;
    let suggestion: string | null = null;
    if (h.ok && mode === "strict") {
      try {
        const c = await deps.check(s, before);
        if (!c.ok && c.violations.length) {
          found = c.violations.map((v) => ({ ...v, source: "llm" as const }));
          suggestion = c.simplified;
        }
      } catch {
        // The checker is a safety net; the heuristics already passed.
      }
    }
    if (!found.length) return s;

    violations.push(found);
    opts.onViolation?.(i, found);
    const candidates: (() => Promise<string | null>)[] = [
      async () => suggestion,
      async () => (await deps.fixSentence(s, before, found)).trim() || null,
    ];
    for (const next of candidates) {
      let c: string | null = null;
      try {
        c = await next();
      } catch {
        c = null;
      }
      if (c && sentenceCheck(level, c, { intent, previous: seen }).ok) {
        fixed++;
        return c.trim();
      }
    }
    dropped++;
    return null;
  };

  const push = (s: string) => {
    if (queue.length >= max) {
      truncated = true;
      ctrl.abort(); // enough sentences for this turn: stop generating
      return;
    }
    raw.push(s);
    queue.push(processSentence(s, queue.length));
    wake?.();
  };

  void deps
    .generate((d) => buf.push(d).forEach(push), ctrl.signal)
    .catch((err) => {
      if (!ctrl.signal.aborted) genError = err;
    })
    .finally(() => {
      buf.flush().forEach(push);
      genDone = true;
      wake?.();
    });

  // Emit in order as soon as each sentence is ready.
  const out: string[] = [];
  for (let i = 0; ; ) {
    if (i < queue.length) {
      const t = await queue[i++];
      if (t) {
        out.push(t);
        opts.onSentence(t);
      }
      continue;
    }
    if (genDone) break;
    await new Promise<void>((r) => (wake = r));
    wake = null;
  }

  if (out.length === 0 && genError) throw genError;

  let fallback = false;
  if (out.length === 0) {
    fallback = true;
    const pool = LEVEL_CONFIG[level].safeFallbacks.filter((x) => !previous.has(normalizeSentence(x)));
    const list = pool.length ? pool : LEVEL_CONFIG[level].safeFallbacks;
    const pick = list[Math.floor((opts.random ?? Math.random)() * list.length)] ?? list[0];
    out.push(pick);
    opts.onSentence(pick);
  } else if (!out.some((s) => s.includes("?"))) {
    // Every turn hands the conversation back to the learner.
    const q = FOLLOW_UPS[level][Math.floor((opts.random ?? Math.random)() * FOLLOW_UPS[level].length)];
    out.push(q);
    opts.onSentence(q);
  }

  return { text: out.join(" "), sentences: out, fixed, dropped, truncated, fallback, violations };
}

/** Fast mode: the reply was already spoken; validate afterwards so the next turn can be steered. */
export async function checkAfterTheFact(
  level: Level,
  text: string,
  check: (t: string) => Promise<CheckResult>,
  intent: Intent = "chat",
): Promise<Violation[]> {
  const h = heuristicCheck(level, text, { intent });
  if (!h.ok) return h.violations;
  try {
    const c = await check(text);
    return c.ok ? [] : c.violations.map((v) => ({ ...v, source: "llm" as const }));
  } catch {
    return [];
  }
}
