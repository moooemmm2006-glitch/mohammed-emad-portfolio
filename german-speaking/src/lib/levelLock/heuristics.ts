// Fast, deterministic level checks. They run on every sentence before the (slower) LLM checker,
// so obviously-too-hard sentences are fixed without spending a model call.

import type { Intent } from "../intent";
import { LEVEL_CONFIG, type Level } from "../levels";
import { splitSentences, tokenizeWords } from "../text";

export interface Violation {
  rule: string;
  excerpt: string;
  source: "heuristic" | "llm";
}

export interface HeuristicResult {
  ok: boolean;
  violations: Violation[];
}

export interface CheckOptions {
  /** explain/story/opinion turns may be longer; explanations may show the structure they explain. */
  intent?: Intent;
  /** Normalised sentences the partner already said in this conversation (no repeats). */
  previous?: Set<string>;
}

const ARABIC = /[؀-ۿ]/;
// A short Arabic hint in round brackets, allowed in A1/A2 explanations: "(الفعل بيروح آخر الجملة)".
const ARABIC_HINT = /\s*\([^()]*[؀-ۿ][^()]*\)/g;

/** Remove bracketed Arabic hints (used before checking and before text-to-speech). */
export function stripArabicHints(text: string): string {
  return text.replace(ARABIC_HINT, "").replace(/\s+([.,!?;:])/g, "$1").trim();
}

export function normalizeSentence(s: string): string {
  return stripArabicHints(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Short reactions ("Super!", "Ach so.") may repeat; anything with 4+ words may not. */
export function isRepeat(sentence: string, previous?: Set<string>): boolean {
  if (!previous?.size) return false;
  const n = normalizeSentence(sentence);
  return n.split(" ").length >= 4 && previous.has(n);
}

export function sentenceCheck(level: Level, sentence: string, opts: CheckOptions = {}): HeuristicResult {
  const cfg = LEVEL_CONFIG[level];
  const violations: Violation[] = [];
  const hintsAllowed = opts.intent === "explain" && (level === "A1" || level === "A2");
  const s = hintsAllowed ? stripArabicHints(sentence) : sentence.trim();

  if (!s) return { ok: false, violations: [{ rule: "Empty sentence", excerpt: "", source: "heuristic" }] };

  if (ARABIC.test(s)) {
    violations.push({ rule: "Not German (Arabic script)", excerpt: s.slice(0, 60), source: "heuristic" });
  }

  const words = tokenizeWords(s);
  if (words.length > cfg.limits.maxWordsPerSentence) {
    violations.push({ rule: `Sentence too long (${words.length} words > ${cfg.limits.maxWordsPerSentence})`, excerpt: s, source: "heuristic" });
  }
  const longWord = words.find((w) => w.length > cfg.limits.maxWordLength);
  if (longWord) violations.push({ rule: `Word too complex for ${level}`, excerpt: longWord, source: "heuristic" });

  // In an explanation the example sentences may contain the structure being explained
  // (e.g. a Perfekt example when an A1 learner asks what Perfekt is), so grammar patterns are skipped.
  if (opts.intent !== "explain") {
    for (const { rule, pattern } of cfg.forbiddenPatterns) {
      const m = s.match(pattern);
      if (m) violations.push({ rule, excerpt: m[0].trim().slice(0, 120), source: "heuristic" });
    }
  }

  if (isRepeat(s, opts.previous)) {
    violations.push({ rule: "Repeats a sentence already said in this conversation", excerpt: s, source: "heuristic" });
  }

  return { ok: violations.length === 0, violations };
}

export function maxSentencesFor(level: Level, intent: Intent = "chat"): number {
  const l = LEVEL_CONFIG[level].limits;
  return intent === "chat" ? l.maxSentences : l.maxSentencesLong;
}

/** Whole-reply check: every sentence passes and the reply is not too long for this kind of turn. */
export function heuristicCheck(level: Level, text: string, opts: CheckOptions = {}): HeuristicResult {
  if (!text.trim()) return { ok: false, violations: [{ rule: "Empty reply", excerpt: "", source: "heuristic" }] };
  const sentences = splitSentences(text);
  const violations: Violation[] = [];
  const max = maxSentencesFor(level, opts.intent);
  if (sentences.length > max) {
    violations.push({
      rule: `Too many sentences (${sentences.length} > ${max})`,
      excerpt: sentences.slice(max).join(" ").slice(0, 120),
      source: "heuristic",
    });
  }
  for (const s of sentences) violations.push(...sentenceCheck(level, s, opts).violations);
  return { ok: violations.length === 0, violations };
}
