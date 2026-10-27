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
import { LLMReportSchema, normalizeReport, overallScore, type StoredReport } from "./schema";
import { diffTracker, updateWeaknessTracker } from "./weakness";

export class ReportError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "too_short" | "llm_failed",
  ) {
    super(message);
  }
}

export function buildReportContext(sessionId: string, language?: "ar" | "en" | "de"): ReportContext {
  const s = getSession(sessionId);
  if (!s || !isLevel(s.level)) throw new ReportError("Session not found", "not_found");
  const transcript: TranscriptTurn[] = getTurns(sessionId).map((t) => {
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
  const previous = listReports()
    .filter((r) => r.session.sessionId !== sessionId && r.session.date < info.date)
    .slice(-5)
    .map(briefFromReport);
  const tracker = getWeaknesses().map(({ tag, kind, status, totalCount, firstSeen, lastSeen }) => ({ tag, kind, status, totalCount, firstSeen, lastSeen }));
  return { info, level: s.level, language: language ?? getSettings().reportLang, transcript, previous, tracker };
}

/** Generate (or regenerate) the report for a session, update the weakness tracker, persist both. */
export async function generateReport(sessionId: string, opts: { language?: "ar" | "en" | "de"; llm?: LLM } = {}): Promise<StoredReport> {
  const ctx = buildReportContext(sessionId, opts.language);
  if (ctx.info.userTurns === 0) throw new ReportError("Nothing was said in this session yet", "too_short");

  const llm = opts.llm ?? getLLM();
  const cfg = serverConfig();
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
  const report = normalizeReport(raw);

  // Regenerating a report must not count the same session twice in the tracker:
  // rebuild the tracker from all reports in date order with this one replaced.
  const others = listReports().filter((r) => r.session.sessionId !== sessionId);
  const before = rebuildTracker(others.filter((r) => r.session.date < ctx.info.date));
  const sessionCounts = { sessionId, date: ctx.info.date, counts: report.weaknessCounts };
  const afterThis = updateWeaknessTracker(before, sessionCounts);

  const stored: StoredReport = {
    ...report,
    session: ctx.info,
    language: ctx.language,
    overall: overallScore(report.scores),
    generatedBy: llm.provider,
    trackerChanges: diffTracker(before, afterThis),
  };

  const later = others.filter((r) => r.session.date >= ctx.info.date);
  let finalTracker = afterThis;
  for (const r of later) {
    finalTracker = updateWeaknessTracker(finalTracker, { sessionId: r.session.sessionId, date: r.session.date, counts: r.weaknessCounts });
  }

  const s = getSession(sessionId)!;
  if (!s.endedAt) updateSession(sessionId, { endedAt: s.lastActiveAt, status: "ended" });
  saveReport(stored);
  saveWeaknesses(finalTracker);
  return stored;
}

export function rebuildTracker(reportsOldestFirst: StoredReport[]) {
  return reportsOldestFirst.reduce(
    (acc, r) => updateWeaknessTracker(acc, { sessionId: r.session.sessionId, date: r.session.date, counts: r.weaknessCounts }),
    [] as ReturnType<typeof updateWeaknessTracker>,
  );
}

export { getReport };
