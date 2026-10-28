import { z } from "zod";
import type { Correction } from "./corrections";
import type { BookReport } from "./book";

// What the model must return. Kept free of numeric min/max so it works with native structured
// outputs; ranges are enforced afterwards by `normalizeReport`.
export const ScoreKeys = ["grammar", "vocabulary", "fluency", "pronunciation", "complexity", "confidence"] as const;
export type ScoreKey = (typeof ScoreKeys)[number];

const scoresShape = Object.fromEntries(ScoreKeys.map((k) => [k, z.number()])) as Record<ScoreKey, z.ZodNumber>;
const scoreNotesShape = Object.fromEntries(ScoreKeys.map((k) => [k, z.string()])) as Record<ScoreKey, z.ZodString>;

export const WeaknessKind = z.enum(["grammar", "pronunciation", "vocabulary", "fluency"]);
export type WeaknessKind = z.infer<typeof WeaknessKind>;

export const LLMReportSchema = z.object({
  sinceLastTime: z.object({
    summary: z.string(),
    improved: z.array(z.string()),
    regressed: z.array(z.string()),
    newIssues: z.array(z.string()),
    unresolved: z.array(z.string()),
    lastFiveTrend: z.string(),
  }),
  overallImpression: z.string(),
  scores: z.object(scoresShape),
  scoreNotes: z.object(scoreNotesShape),
  strengths: z.array(z.object({ point: z.string(), example: z.string() })),
  mistakes: z.array(
    z.object({
      said: z.string(),
      corrected: z.string(),
      explanation: z.string(),
      tag: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    }),
  ),
  pronunciation: z.object({
    disclaimer: z.string(),
    notes: z.array(
      z.object({
        word: z.string(),
        tag: z.string(),
        issue: z.string(),
        tip: z.string(),
        indicator: z.enum(["low_confidence", "transcript_mismatch", "typical_pitfall"]),
      }),
    ),
  }),
  vocabulary: z.object({
    goodWords: z.array(z.string()),
    struggledWith: z.array(z.string()),
    learnNext: z.array(z.object({ de: z.string(), meaning: z.string(), example: z.string() })),
  }),
  homework: z.array(z.object({ title: z.string(), description: z.string() })),
  levelRecommendation: z.object({
    verdict: z.enum(["stay", "move_up", "move_down"]),
    reasoning: z.string(),
  }),
  correctedSentences: z.array(z.object({ original: z.string(), corrected: z.string() })),
  weaknessCounts: z.array(z.object({ tag: z.string(), kind: WeaknessKind, count: z.number() })),
  nextFocus: z.string().nullable(),
});
export type LLMReport = z.infer<typeof LLMReportSchema>;

export interface SessionInfo {
  sessionId: string;
  level: string;
  date: string; // ISO
  durationSec: number;
  userTurns: number;
  userWords: number;
  topic: string | null;
}

export interface StoredReport extends LLMReport {
  session: SessionInfo;
  language: "ar" | "en" | "de";
  overall: number;
  generatedBy: "anthropic" | "mock";
  /** Deterministic tracker diff (tags), shown next to the model's "since last time" text. */
  trackerChanges?: { improved: string[]; regressed: string[]; new: string[]; unresolved: string[] };
  /** Every learner sentence with its correction (older reports may not have this). */
  corrections?: Correction[];
  /** "ai" = corrected by Claude; "rules" = demo rule-based checker. */
  correctionsMode?: "ai" | "rules";
  /** Guided conversation about a book topic: book sentences said wrong, with the book's version. */
  book?: BookReport;
}

const TAG_RE = /^[a-z0-9_]+$/;

export function normalizeTag(tag: string): string {
  const t = tag
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return TAG_RE.test(t) && t ? t : "sonstiges";
}

export function kindForTag(tag: string): WeaknessKind {
  if (tag.startsWith("pron_")) return "pronunciation";
  if (tag.startsWith("fluency") || tag === "doppeltes_wort") return "fluency";
  if (tag === "wortschatz" || tag.startsWith("vocab")) return "vocabulary";
  return "grammar";
}
