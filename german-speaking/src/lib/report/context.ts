import { GRAMMAR_TAGS, LEVEL_CONFIG, type Level } from "../levels";
import { countWords } from "../text";
import type { SessionInfo, StoredReport } from "./schema";
import type { Correction } from "./corrections";
import type { WeaknessEntry } from "./weakness";

export interface TranscriptTurn {
  role: "learner" | "partner";
  text: string;
  at: string;
  confidence: number | null;
  alternatives: string[];
  input: "voice" | "text" | null;
}

export interface PreviousSessionBrief {
  date: string;
  level: string;
  overall: number;
  scores: StoredReport["scores"];
  mistakeTags: { tag: string; count: number }[];
  homework: string[];
  nextFocus: string | null;
}

export interface ReportContext {
  info: SessionInfo;
  level: Level;
  language: "ar" | "en" | "de";
  transcript: TranscriptTurn[];
  previous: PreviousSessionBrief[]; // newest last, max 5
  tracker: Pick<WeaknessEntry, "tag" | "kind" | "status" | "totalCount" | "firstSeen" | "lastSeen">[];
  /** Sentence-by-sentence corrections of every learner turn (computed before the report). */
  corrections?: Correction[];
}

export function briefFromReport(r: StoredReport): PreviousSessionBrief {
  const counts = new Map<string, number>();
  for (const w of r.weaknessCounts) counts.set(w.tag, w.count);
  return {
    date: r.session.date,
    level: r.session.level,
    overall: r.overall,
    scores: r.scores,
    mistakeTags: [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
    homework: r.homework.map((h) => h.title),
    nextFocus: r.nextFocus,
  };
}

export function sessionInfoFrom(
  s: { id: string; level: string; startedAt: number; endedAt: number | null; lastActiveAt: number; topic: string | null },
  transcript: TranscriptTurn[],
): SessionInfo {
  const learner = transcript.filter((t) => t.role === "learner");
  return {
    sessionId: s.id,
    level: s.level,
    date: new Date(s.startedAt).toISOString(),
    durationSec: Math.max(0, Math.round(((s.endedAt ?? s.lastActiveAt) - s.startedAt) / 1000)),
    userTurns: learner.length,
    userWords: learner.reduce((n, t) => n + countWords(t.text), 0),
    topic: s.topic,
  };
}

const LANG_NAME = {
  ar: "Arabic — simple, warm, friendly; Egyptian-flavoured Modern Standard Arabic is welcome. German examples stay in German.",
  en: "English — simple and friendly. German examples stay in German.",
  de: "German — simple and clear, at about the learner's level + one step. Examples in German.",
};

export function reportSystemPrompt(language: ReportContext["language"]): string {
  return `You are an experienced, honest and encouraging German speaking coach for Arabic-speaking learners (mostly Egyptians) who need spoken German for work.
You write a detailed post-conversation report as JSON. All explanatory text must be in ${LANG_NAME[language]}

Principles:
- Base everything on what the learner ACTUALLY said in the transcript. Quote real examples. Never invent quotes.
- Judge the learner against the session level (CEFR). Be honest but kind: name problems clearly, celebrate real progress.
- The transcript comes from speech recognition, so small spelling/capitalisation/punctuation differences are recognition artefacts, not mistakes. Only flag grammar/vocabulary problems that are audible in speech.
- Scores are 0-100 relative to what is expected at this level (70 = solid at this level).
- "fluency" uses turn lengths, fillers (äh, ähm), very short answers, and switching to Arabic/English as signals.
- "confidence" = did the learner take initiative, ask questions, carry the conversation, or only answer minimally?
- Pronunciation: you only have a transcript, recognition confidence (0-1) and alternative hypotheses. Use low confidence (< 0.75) and words where the alternatives differ as INDICATORS only, plus typical pitfalls for Arabic speakers that fit words the learner actually used: ch-Laut [ç]/[x] vs sch [ʃ]; ü/ö/ä; p vs b; German r; final-consonant devoicing (Auslautverhärtung: Tag → [k]); long vs short vowels; z = [ts]; w = [v]; v = [f]. The "disclaimer" must say clearly that these notes are indicative, not a certified assessment.
- Mistake tags: use these snake_case tags when they fit: ${Object.keys(GRAMMAR_TAGS).join(", ")}. Create a new short snake_case tag only if none fits. Pronunciation tags start with "pron_".
- weaknessCounts: how often each tag occurred in THIS session (grammar mistakes, pronunciation indicators, fluency, vocabulary).
- Memory: you receive previous sessions and the weakness tracker. The "sinceLastTime" section must explicitly compare with the last session and the last 5 sessions: what improved (tags that were problems before and now appear less or not at all), what regressed, what is new, what is still unresolved. Mention earlier homework if it was practised. If there are no previous sessions, say this is the first session and set lists to [].
- homework: 3-5 concrete, actionable exercises for the next session, tailored to the mistakes (e.g. "Say 5 sentences about your morning with aufstehen, anrufen, einkaufen").
- learnNext: 5-10 useful words/phrases related to what the learner talked about, with meaning in the report language and a German example at the session level.
- correctedSentences: each learner sentence that had a mistake, with a natural corrected version.
- levelRecommendation: stay / move_up / move_down with reasoning (needs enough evidence; with very little speech, recommend staying).
- nextFocus: the single most useful grammar tag to practise next session (or null).
- If the learner said very little, keep lists short and say so honestly.
- You receive "corrections": every learner sentence already corrected one by one. Base the scores and the comparison on them.
- "strengths": ONLY praise things that were actually correct. Quote ONLY sentences whose correction has isCorrect=true. NEVER quote a sentence that has fixes as a positive example. If there is nothing strong, praise effort, courage or fluency instead and leave "example" empty.
- "mistakes" and "correctedSentences": return empty arrays — the complete lists are built from the corrections.`;
}

export function reportUserPrompt(ctx: ReportContext): string {
  const cfg = LEVEL_CONFIG[ctx.level];
  const payload = {
    session: ctx.info,
    levelExpectations: { level: ctx.level, allowedGrammar: cfg.allowedGrammar, vocabulary: cfg.vocabulary },
    transcript: ctx.transcript.map((t) => ({
      who: t.role,
      text: t.text,
      ...(t.role === "learner" ? { confidence: t.confidence, alternatives: t.alternatives, input: t.input } : {}),
    })),
    corrections: (ctx.corrections ?? []).map((c) => ({ turn: c.turn, original: c.original, isCorrect: c.isCorrect, corrected: c.corrected, fixes: c.fixes.map((f) => `${f.wrong} → ${f.right} (${f.tag})`) })),
    previousSessions: ctx.previous,
    weaknessTracker: ctx.tracker,
  };
  return `Here is the session data as JSON. Write the report.\n\n${JSON.stringify(payload, null, 1)}`;
}
