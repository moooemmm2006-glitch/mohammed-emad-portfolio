// Sentence-by-sentence correction of everything the learner said in a session.
// Real mode: the report model reviews every learner turn (in batches, missing turns are
// re-requested). Demo mode: a small rule-based checker.

import { z } from "zod";
import type { LLM } from "../llm";
import type { Level } from "../levels";
import { LEVEL_CONFIG } from "../levels";
import { GRAMMAR_TAGS } from "../tags";
import { ruleCorrect } from "./ruleCorrections";

export const FixSchema = z.object({
  wrong: z.string(), // the exact wrong words as the learner said them
  right: z.string(), // the corrected words
  explanation: z.string(), // short, in the report language
  tag: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});
export type Fix = z.infer<typeof FixSchema>;

export const CorrectionSchema = z.object({
  turn: z.number(),
  original: z.string(),
  corrected: z.string(),
  isCorrect: z.boolean(),
  /** Optional more natural way to say it (also for correct sentences). */
  natural: z.string().nullable(),
  fixes: z.array(FixSchema),
});
export type Correction = z.infer<typeof CorrectionSchema>;

export const CorrectionBatchSchema = z.object({ corrections: z.array(CorrectionSchema) });

export interface LearnerTurn {
  turn: number; // 1-based index among the learner's (non-filler) turns
  text: string;
}

const FILLER = /^(m+h*m+|ä+h*m*|ö+h*m*|e+h*m+|h+m+|u+h*m*|aha|ah|oh|na)$/i;

/** "Mhm", "äh", "ähm …" — not a sentence to correct (but still counts for fluency). */
export function isFillerOnly(text: string): boolean {
  const words = text.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  return words.length === 0 || words.every((w) => FILLER.test(w));
}

export function learnerTurnsToCorrect(transcript: { role: string; text: string }[]): LearnerTurn[] {
  return transcript
    .filter((t) => t.role === "learner" && !isFillerOnly(t.text))
    .map((t, i) => ({ turn: i + 1, text: t.text.trim() }));
}

const LANG = { ar: "simple Egyptian-friendly Arabic", en: "simple English", de: "simple German" };

export function correctionSystemPrompt(level: Level, language: "ar" | "en" | "de"): string {
  return `You are a meticulous, kind German teacher correcting the SPOKEN sentences of an Arabic-speaking learner at CEFR level ${level}.
For EVERY learner turn you receive, return exactly one entry with the same "turn" number — never skip a turn, never merge turns.

For each turn:
- original: the learner's text exactly as given.
- corrected: the full sentence(s) corrected into natural, correct German, as close to the learner's words and meaning as possible.
- isCorrect: true only if there is no real mistake.
- fixes: EVERY mistake, one entry each: wrong = the exact wrong words copied from the original, right = the corrected words as they appear in "corrected", explanation = one short sentence in ${LANG[language]} (German examples stay in German), tag = a snake_case category, severity = low | medium | high.
- natural: a more natural or idiomatic way to say the same thing at about level ${level} (or null if the corrected sentence is already natural).

Rules:
- The text comes from speech recognition: ignore capitalisation and punctuation; do not flag them. Do flag repeated words ("mit mit"), missing verbs, wrong word order, wrong case after prepositions, wrong verb forms, wrong vocabulary.
- Use these tags when they fit: ${Object.keys(GRAMMAR_TAGS).join(", ")}. Use doppeltes_wort for repeated words.
- Severity: high = meaning unclear or a core rule (verb position, missing verb, modal verb order); medium = case/article/preposition/tense; low = small slips and repetitions.
- Judge against level ${level}: ${LEVEL_CONFIG[level].allowedGrammar.slice(0, 4).join("; ")}.`;
}

export function correctionUserPrompt(turns: LearnerTurn[]): string {
  return `Learner turns to correct (JSON):\n${JSON.stringify(turns.map((t) => ({ turn: t.turn, text: t.text })))}`;
}

/** Rule-based correction (demo mode, and fallback if the model keeps skipping a turn). */
export function ruleCorrection(t: LearnerTurn, language: "ar" | "en" | "de"): Correction {
  const { corrected, fixes } = ruleCorrect(t.text, language);
  return { turn: t.turn, original: t.text, corrected, isCorrect: fixes.length === 0, natural: null, fixes };
}

const BATCH = 10;

export interface CorrectOptions {
  llm: LLM;
  model: string;
  level: Level;
  language: "ar" | "en" | "de";
  /** Written text (Schreiben): spelling, capitals and punctuation count too. */
  written?: boolean;
}

const WRITTEN_NOTE = `
IMPORTANT: these are WRITTEN texts, not speech. Also correct spelling, capitalisation (nouns!), umlauts and punctuation, and tag them (e.g. "rechtschreibung").`;

/** Correct every learner turn. Never returns fewer entries than turns. */
export async function correctAllTurns(turns: LearnerTurn[], o: CorrectOptions): Promise<{ corrections: Correction[]; mode: "ai" | "rules" }> {
  if (turns.length === 0) return { corrections: [], mode: o.llm.provider === "mock" ? "rules" : "ai" };
  if (o.llm.provider === "mock") return { corrections: turns.map((t) => ruleCorrection(t, o.language)), mode: "rules" };

  const byTurn = new Map<number, Correction>();
  const batches: LearnerTurn[][] = [];
  for (let i = 0; i < turns.length; i += BATCH) batches.push(turns.slice(i, i + BATCH));

  const runBatch = async (batch: LearnerTurn[]) => {
    let missing = batch;
    // First request plus up to two re-requests for turns the model skipped.
    for (let attempt = 0; attempt < 3 && missing.length; attempt++) {
      try {
        const out = await o.llm.json({
          model: o.model,
          system: correctionSystemPrompt(o.level, o.language) + (o.written ? WRITTEN_NOTE : ""),
          prompt: correctionUserPrompt(missing),
          schema: CorrectionBatchSchema,
          maxTokens: 6000,
          purpose: "corrections",
          effort: "medium",
        });
        for (const c of out.corrections) {
          const src = missing.find((t) => t.turn === c.turn);
          if (src) byTurn.set(c.turn, { ...c, original: src.text, isCorrect: c.isCorrect && c.fixes.length === 0 });
        }
      } catch {
        // retry below
      }
      missing = missing.filter((t) => !byTurn.has(t.turn));
    }
  };
  await Promise.all(batches.map(runBatch));

  // Anything still missing gets the rule-based check, so no sentence is ever skipped.
  const corrections = turns.map((t) => byTurn.get(t.turn) ?? ruleCorrection(t, o.language));
  return { corrections, mode: "ai" };
}

/** The complete mistakes list, derived from the corrections (one entry per fix). */
export function mistakesFromCorrections(corrections: Correction[]) {
  return corrections.flatMap((c) =>
    c.fixes.map((f) => ({ said: f.wrong, corrected: f.right, explanation: f.explanation, tag: f.tag, severity: f.severity, sentence: c.original })),
  );
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** True if `example` quotes (part of) a sentence that had mistakes. */
export function quotesWrongSentence(example: string, corrections: Correction[]): boolean {
  const e = norm(example);
  if (!e) return false;
  return corrections.some((c) => !c.isCorrect && (norm(c.original).includes(e) || e.includes(norm(c.original)) || c.fixes.some((f) => e.includes(norm(f.wrong)))));
}
