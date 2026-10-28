import { serverConfig } from "../config";
import { isLevel } from "../levels";
import { getLLM, type LLM } from "../llm";
import {
  getReport,
  getSession,
  getSettings,
  getTurns,
  getWeaknesses,
  listReports,
  parseMeta,
  saveReport,
  saveWeaknesses,
  updateSession,
} from "../db/repo";
import { briefFromReport, reportSystemPrompt, reportUserPrompt, sessionInfoFrom, type ReportContext, type TranscriptTurn } from "./context";
import { correctAllTurns, learnerTurnsToCorrect, mistakesFromCorrections, quotesWrongSentence } from "./corrections";
import { LLMReportSchema, normalizeReport, overallScore, type StoredReport } from "./schema";
import { diffTracker, updateWeaknessTracker, type SessionCounts } from "./weakness";
import { writingTimeline } from "../writing";
import { bookReportForSession } from "./book";

export class ReportError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "too_short" | "llm_failed",
  ) {
    super(message);
  }
}

export async function buildReportContext(sessionId: string, language?: "ar" | "en" | "de"): Promise<ReportContext> {
  const s = await getSession(sessionId);
  if (!s || !isLevel(s.level)) throw new ReportError("Session not found", "not_found");
  const transcript: TranscriptTurn[] = (await getTurns(sessionId)).map((t) => {
    const meta = parseMeta(t);
    return {
      role: t.role === "user" ? "learner" : "partner",
      text: t.text,
      at: new Date(t.createdAt).toISOString(),
      confidence: t.confidence,
      alternatives: meta.alternatives ?? [],
      input: meta.input ?? null,
    };
  });
  const info = sessionInfoFrom(s, transcript);
  const previous = (await listReports(s.userId))
    .filter((r) => r.session.sessionId !== sessionId && r.session.date < info.date)
    .slice(-5)
    .map(briefFromReport);
  const tracker = (await getWeaknesses(s.userId)).map(({ tag, kind, status, totalCount, firstSeen, lastSeen }) => ({ tag, kind, status, totalCount, firstSeen, lastSeen }));
  return { userId: s.userId, info, level: s.level, language: language ?? (await getSettings(s.userId)).reportLang, transcript, previous, tracker };
}

/** Generate (or regenerate) the report for a session, update the weakness tracker, persist both. */
export async function generateReport(sessionId: string, opts: { language?: "ar" | "en" | "de"; llm?: LLM } = {}): Promise<StoredReport> {
  const ctx = await buildReportContext(sessionId, opts.language);
  if (ctx.info.userTurns === 0) throw new ReportError("Nothing was said in this session yet", "too_short");

  const llm = opts.llm ?? getLLM();
  const cfg = serverConfig();

  // 1) Correct every sentence the learner said (stronger model, batched, nothing skipped).
  const { corrections, mode: correctionsMode } = await correctAllTurns(learnerTurnsToCorrect(ctx.transcript), {
    llm,
    model: cfg.reportModel,
    level: ctx.level,
    language: ctx.language,
  });
  ctx.corrections = corrections;

  // 2) The report itself, informed by the corrections.
  let raw;
  try {
    raw = await llm.json({
      model: cfg.reportModel,
      system: reportSystemPrompt(ctx.language),
      prompt: reportUserPrompt(ctx),
      schema: LLMReportSchema,
      maxTokens: 12000,
      purpose: "report",
      effort: "medium",
      mockContext: ctx,
    });
  } catch (err) {
    throw new ReportError(err instanceof Error ? err.message : "Report generation failed", "llm_failed");
  }
  // The mistakes list is the complete set of fixes, and praise may only quote correct sentences.
  const strengths = raw.strengths.filter((s) => !s.example || !quotesWrongSentence(s.example, corrections));
  const report = normalizeReport({
    ...raw,
    mistakes: mistakesFromCorrections(corrections).map(({ sentence: _s, ...m }) => (void _s, m)),
    correctedSentences: corrections.filter((c) => !c.isCorrect).map((c) => ({ original: c.original, corrected: c.corrected })),
    strengths: strengths.length ? strengths : [{ point: EFFORT_PRAISE[ctx.language], example: "" }],
  });

  // Regenerating a report must not count the same session twice in the tracker:
  // rebuild the tracker from all reports in date order with this one replaced.
  // Free-writing checks (Schreiben) are part of the same timeline.
  const others = (await listReports(ctx.userId)).filter((r) => r.session.sessionId !== sessionId);
  const timeline: SessionCounts[] = [
    ...others.map((r) => ({ sessionId: r.session.sessionId, date: r.session.date, counts: r.weaknessCounts })),
    ...(await writingTimeline(ctx.userId)),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const before = timeline.filter((x) => x.date < ctx.info.date).reduce(updateWeaknessTracker, [] as ReturnType<typeof updateWeaknessTracker>);
  const sessionCounts = { sessionId, date: ctx.info.date, counts: report.weaknessCounts };
  const afterThis = updateWeaknessTracker(before, sessionCounts);

  const sessionRow = (await getSession(sessionId))!;
  const book = await bookReportForSession(ctx.userId, sessionRow.bookTopic, await getTurns(sessionId), !(await getReport(sessionId)));
  const stored: StoredReport = {
    ...report,
    ...(book ? { book } : {}),
    session: ctx.info,
    language: ctx.language,
    overall: overallScore(report.scores),
    generatedBy: llm.provider,
    trackerChanges: diffTracker(before, afterThis),
    corrections,
    correctionsMode,
  };

  const later = timeline.filter((x) => x.date >= ctx.info.date);
  let finalTracker = afterThis;
  for (const x of later) finalTracker = updateWeaknessTracker(finalTracker, x);

  const s = (await getSession(sessionId))!;
  if (!s.endedAt) await updateSession(sessionId, { endedAt: s.lastActiveAt, status: "ended" });
  await saveReport(stored, ctx.userId);
  await saveWeaknesses(finalTracker, ctx.userId);
  return stored;
}

const EFFORT_PRAISE = {
  ar: "اتكلمت وحاولت تعبّر عن أفكارك بالألماني من غير ما تستسلم — وده أهم خطوة.",
  en: "You kept speaking and tried to express your ideas in German without giving up — that's the most important step.",
  de: "Du hast weitergesprochen und versucht, deine Ideen auf Deutsch auszudrücken — das ist der wichtigste Schritt.",
};

export function rebuildTracker(reportsOldestFirst: StoredReport[]) {
  return reportsOldestFirst.reduce(
    (acc, r) => updateWeaknessTracker(acc, { sessionId: r.session.sessionId, date: r.session.date, counts: r.weaknessCounts }),
    [] as ReturnType<typeof updateWeaknessTracker>,
  );
}

export { getReport };
