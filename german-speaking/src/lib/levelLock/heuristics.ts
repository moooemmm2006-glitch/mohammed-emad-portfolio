// Fast, deterministic first-pass level check. It runs on every draft before the (slower) LLM checker,
// so obviously-too-hard drafts are rejected without spending a model call.

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

export function heuristicCheck(level: Level, text: string): HeuristicResult {
  const cfg = LEVEL_CONFIG[level];
  const violations: Violation[] = [];
  const sentences = splitSentences(text);

  if (!text.trim()) {
    return { ok: false, violations: [{ rule: "Empty reply", excerpt: "", source: "heuristic" }] };
  }

  if (sentences.length > cfg.limits.maxSentences) {
    violations.push({
      rule: `Too many sentences (${sentences.length} > ${cfg.limits.maxSentences})`,
      excerpt: sentences.slice(cfg.limits.maxSentences).join(" ").slice(0, 120),
      source: "heuristic",
    });
  }

  for (const s of sentences) {
    const words = tokenizeWords(s);
    if (words.length > cfg.limits.maxWordsPerSentence) {
      violations.push({
        rule: `Sentence too long (${words.length} words > ${cfg.limits.maxWordsPerSentence})`,
        excerpt: s,
        source: "heuristic",
      });
    }
    const longWord = words.find((w) => w.length > cfg.limits.maxWordLength);
    if (longWord) {
      violations.push({ rule: `Word too complex for ${level}`, excerpt: longWord, source: "heuristic" });
    }
  }

  for (const { rule, pattern } of cfg.forbiddenPatterns) {
    const m = text.match(pattern);
    if (m) violations.push({ rule, excerpt: m[0].trim().slice(0, 120), source: "heuristic" });
  }

  // The partner must stay in German (Latin script only); Arabic belongs to the hint button.
  if (/[؀-ۿ]/.test(text)) {
    violations.push({ rule: "Not German (Arabic script)", excerpt: text.slice(0, 60), source: "heuristic" });
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Last-resort shaping when every attempt failed: keep only the sentences that pass on their own,
 * up to the sentence limit. Returns null when nothing usable is left.
 */
export function salvageSentences(level: Level, text: string): string | null {
  const cfg = LEVEL_CONFIG[level];
  const kept = splitSentences(text).filter((s) => heuristicCheck(level, s).ok);
  if (kept.length === 0) return null;
  const trimmed = kept.slice(0, cfg.limits.maxSentences);
  // Keep the "pull the learner in" rule: end with a question when possible.
  if (!trimmed.some((s) => s.endsWith("?"))) return null;
  return trimmed.join(" ");
}
