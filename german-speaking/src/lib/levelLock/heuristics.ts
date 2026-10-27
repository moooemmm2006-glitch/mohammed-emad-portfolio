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
  /** explain/story/opinion/question turns may be longer; explanations may show the structure they explain. */
  intent?: Intent;
  /** Normalised sentences the partner already said in this conversation (no repeats). */
  previous?: Set<string>;
  /** A1/A2: a short Arabic explanation is allowed (explanations, or the learner asked in Arabic). */
  allowArabic?: boolean;
}

const AR = "\\u0600-\\u06FF";
const ARABIC = new RegExp(`[${AR}]`);
// Arabic in round brackets "(الفعل بيروح آخر الجملة)" …
const ARABIC_HINT = new RegExp(`\\s*\\([^()]*[${AR}][^()]*\\)`, "g");
// … or a run of Arabic words (with Arabic punctuation).
const ARABIC_RUN = new RegExp(`[${AR}][${AR}\\s،؛؟.,!:«»"\\-–]*`, "g");

/** Remove Arabic (bracketed hints and Arabic sentences): used before checking German and before text-to-speech. */
export function stripArabicHints(text: string): string {
  return text
    .replace(ARABIC_HINT, "")
    .replace(ARABIC_RUN, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function isArabicSentence(s: string): boolean {
  const letters = s.replace(/[^\p{L}]/gu, "");
  const arabic = s.replace(new RegExp(`[^${AR}]`, "g"), "");
  return letters.length > 0 && arabic.length / letters.length > 0.5;
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

export function arabicAllowed(level: Level, opts: CheckOptions): boolean {
  return (opts.allowArabic ?? opts.intent === "explain") && (level === "A1" || level === "A2");
}

export function sentenceCheck(level: Level, sentence: string, opts: CheckOptions = {}): HeuristicResult {
  const cfg = LEVEL_CONFIG[level];
  const violations: Violation[] = [];
  const arabicOk = arabicAllowed(level, opts);
  const s = arabicOk ? stripArabicHints(sentence) : sentence.trim();

  // An allowed Arabic explanation sentence has no German part to check.
  if (arabicOk && !s && ARABIC.test(sentence)) return { ok: true, violations: [] };
  if (!s) return { ok: false, violations: [{ rule: "Empty sentence", excerpt: "", source: "heuristic" }] };

  if (ARABIC.test(s)) {
    violations.push({ rule: "Not German (Arabic script)", excerpt: s.slice(0, 60), source: "heuristic" });
  }

  const words = tokenizeWords(s);
  if (words.length > cfg.limits.maxWordsPerSentence) {
    violations.push({ rule: `Sentence too long (${words.length} words > ${cfg.limits.maxWordsPerSentence})`, excerpt: s, source: "heuristic" });
  }

  // In an explanation grammar terms (Adjektivendungen …) may be long, and example sentences may
  // contain the structure being explained (a Perfekt example when an A1 learner asks what Perfekt is).
  const explaining = opts.intent === "explain";
  const longWord = explaining ? undefined : words.find((w) => w.length > cfg.limits.maxWordLength);
  if (longWord) violations.push({ rule: `Word too complex for ${level}`, excerpt: longWord, source: "heuristic" });

  if (!explaining) {
    for (const { rule, pattern } of cfg.forbiddenPatterns) {
      const m = s.match(pattern);
      if (m) violations.push({ rule, excerpt: m[0].trim().slice(0, 120), source: "heuristic" });
    }
  }

  // Explaining something again (because the learner asked again) is not a forbidden repeat.
  if (!explaining && isRepeat(s, opts.previous)) {
    violations.push({ rule: "Repeats a sentence already said in this conversation", excerpt: s, source: "heuristic" });
  }

  return { ok: violations.length === 0, violations };
}

export function maxSentencesFor(level: Level, intent: Intent = "chat"): number {
  const l = LEVEL_CONFIG[level].limits;
  return intent === "chat" ? l.maxSentences : l.maxSentencesLong;
}

/** Max Arabic explanation sentences per reply (A1/A2): a short hint, then back to German. */
export const MAX_ARABIC_SENTENCES = 2;

/** Whole-reply check: every sentence passes and the reply is not too long for this kind of turn. */
export function heuristicCheck(level: Level, text: string, opts: CheckOptions = {}): HeuristicResult {
  if (!text.trim()) return { ok: false, violations: [{ rule: "Empty reply", excerpt: "", source: "heuristic" }] };
  const sentences = splitSentences(text);
  const violations: Violation[] = [];
  const max = maxSentencesFor(level, opts.intent);
  // Arabic explanation sentences don't count towards the German sentence limit.
  const german = sentences.filter((s) => !isArabicSentence(s));
  if (german.length > max) {
    violations.push({ rule: `Too many sentences (${german.length} > ${max})`, excerpt: german.slice(max).join(" ").slice(0, 120), source: "heuristic" });
  }
  if (sentences.length - german.length > MAX_ARABIC_SENTENCES) {
    violations.push({ rule: "Too much Arabic", excerpt: "", source: "heuristic" });
  }
  for (const s of sentences) violations.push(...sentenceCheck(level, s, opts).violations);
  return { ok: violations.length === 0, violations };
}
