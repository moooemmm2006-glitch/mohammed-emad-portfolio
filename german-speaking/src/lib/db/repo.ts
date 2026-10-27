import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb, schema } from "./index";
import { parseSettings, type Settings } from "../settings";
import type { StoredReport } from "../report/schema";
import type { WeaknessEntry } from "../report/weakness";
import type { Level } from "../levels";

export const LOCAL_USER = "local";

export type SessionRow = typeof schema.sessions.$inferSelect;
export type TurnRow = typeof schema.turns.$inferSelect;

export interface TurnMeta {
  input?: "voice" | "text";
  alternatives?: string[];
  fallback?: string;
  attempts?: number;
  violations?: unknown;
  greeting?: boolean;
  hint?: boolean;
}

export function ensureUser(userId = LOCAL_USER) {
  const db = getDb();
  const u = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!u) db.insert(schema.users).values({ id: userId, name: null, createdAt: Date.now() }).run();
}

// ---------- settings ----------
export function getSettings(userId = LOCAL_USER): Settings {
  const row = getDb().select().from(schema.settings).where(eq(schema.settings.userId, userId)).get();
  return parseSettings(row ? JSON.parse(row.json) : {});
}

export function saveSettings(patch: Partial<Settings>, userId = LOCAL_USER): Settings {
  ensureUser(userId);
  const merged = parseSettings({ ...getSettings(userId), ...patch });
  const json = JSON.stringify(merged);
  getDb()
    .insert(schema.settings)
    .values({ userId, json })
    .onConflictDoUpdate({ target: schema.settings.userId, set: { json } })
    .run();
  return merged;
}

// ---------- sessions ----------
export function createSession(level: Level, topic: string | null, focusTag: string | null, userId = LOCAL_USER): SessionRow {
  ensureUser(userId);
  const now = Date.now();
  const row: SessionRow = {
    id: randomUUID(),
    userId,
    level,
    topic,
    status: "active",
    startedAt: now,
    endedAt: null,
    lastActiveAt: now,
    summary: null,
    summaryUpto: 0,
    focusTag,
    pendingFeedback: null,
  };
  getDb().insert(schema.sessions).values(row).run();
  return row;
}

export function getSession(id: string): SessionRow | undefined {
  return getDb().select().from(schema.sessions).where(eq(schema.sessions.id, id)).get();
}

export function updateSession(id: string, patch: Partial<SessionRow>) {
  getDb().update(schema.sessions).set(patch).where(eq(schema.sessions.id, id)).run();
}

export function listSessions(userId = LOCAL_USER): SessionRow[] {
  return getDb().select().from(schema.sessions).where(eq(schema.sessions.userId, userId)).orderBy(desc(schema.sessions.startedAt)).all();
}

export function deleteSession(id: string) {
  const db = getDb();
  db.delete(schema.turns).where(eq(schema.turns.sessionId, id)).run();
  db.delete(schema.reports).where(eq(schema.reports.sessionId, id)).run();
  db.delete(schema.violationLog).where(eq(schema.violationLog.sessionId, id)).run();
  db.delete(schema.sessions).where(eq(schema.sessions.id, id)).run();
}

// ---------- turns ----------
export function addTurn(
  sessionId: string,
  role: "user" | "partner",
  text: string,
  opts: { confidence?: number | null; meta?: TurnMeta; at?: number } = {},
): TurnRow {
  const at = opts.at ?? Date.now();
  const row = getDb()
    .insert(schema.turns)
    .values({
      sessionId,
      role,
      text,
      createdAt: at,
      confidence: opts.confidence ?? null,
      meta: opts.meta ? JSON.stringify(opts.meta) : null,
    })
    .returning()
    .get();
  updateSession(sessionId, { lastActiveAt: at });
  return row;
}

export function getTurns(sessionId: string): TurnRow[] {
  return getDb().select().from(schema.turns).where(eq(schema.turns.sessionId, sessionId)).orderBy(asc(schema.turns.id)).all();
}

export function parseMeta(t: TurnRow): TurnMeta {
  try {
    return t.meta ? (JSON.parse(t.meta) as TurnMeta) : {};
  } catch {
    return {};
  }
}

// ---------- reports ----------
export function saveReport(report: StoredReport, userId = LOCAL_USER) {
  const json = JSON.stringify(report);
  const values = {
    sessionId: report.session.sessionId,
    userId,
    createdAt: Date.now(),
    language: report.language,
    overall: report.overall,
    json,
  };
  getDb()
    .insert(schema.reports)
    .values(values)
    .onConflictDoUpdate({ target: schema.reports.sessionId, set: { json, overall: values.overall, language: values.language, createdAt: values.createdAt } })
    .run();
  updateSession(report.session.sessionId, { status: "reported" });
}

export function getReport(sessionId: string): StoredReport | null {
  const row = getDb().select().from(schema.reports).where(eq(schema.reports.sessionId, sessionId)).get();
  return row ? (JSON.parse(row.json) as StoredReport) : null;
}

/** Reports ordered oldest → newest by session date. */
export function listReports(userId = LOCAL_USER): StoredReport[] {
  const rows = getDb().select().from(schema.reports).where(eq(schema.reports.userId, userId)).all();
  return rows.map((r) => JSON.parse(r.json) as StoredReport).sort((a, b) => a.session.date.localeCompare(b.session.date));
}

// ---------- weaknesses ----------
export function getWeaknesses(userId = LOCAL_USER): WeaknessEntry[] {
  return getDb()
    .select()
    .from(schema.weaknesses)
    .where(eq(schema.weaknesses.userId, userId))
    .all()
    .map((r) => ({
      tag: r.tag,
      kind: r.kind as WeaknessEntry["kind"],
      firstSeen: r.firstSeen,
      lastSeen: r.lastSeen,
      status: r.status as WeaknessEntry["status"],
      totalCount: r.totalCount,
      absentStreak: r.absentStreak,
      history: JSON.parse(r.history),
    }));
}

export function saveWeaknesses(entries: WeaknessEntry[], userId = LOCAL_USER) {
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(schema.weaknesses).where(eq(schema.weaknesses.userId, userId)).run();
    for (const e of entries) {
      tx.insert(schema.weaknesses)
        .values({
          userId,
          tag: e.tag,
          kind: e.kind,
          firstSeen: e.firstSeen,
          lastSeen: e.lastSeen,
          status: e.status,
          totalCount: e.totalCount,
          absentStreak: e.absentStreak,
          history: JSON.stringify(e.history),
        })
        .run();
    }
  });
}

// ---------- violation log ----------
export function logViolation(sessionId: string, level: string, attempt: number, violations: unknown) {
  getDb()
    .insert(schema.violationLog)
    .values({ sessionId, level, attempt, violations: JSON.stringify(violations), createdAt: Date.now() })
    .run();
}

// ---------- export / import / delete ----------
export const EXPORT_VERSION = 1;

export function exportAll(userId = LOCAL_USER) {
  const db = getDb();
  const sessionRows = listSessions(userId);
  return {
    app: "german-speaking",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: getSettings(userId),
    sessions: sessionRows,
    turns: sessionRows.flatMap((s) => getTurns(s.id)),
    reports: db.select().from(schema.reports).where(eq(schema.reports.userId, userId)).all(),
    weaknesses: db.select().from(schema.weaknesses).where(eq(schema.weaknesses.userId, userId)).all(),
  };
}

export type ExportData = ReturnType<typeof exportAll>;

export function deleteAll(userId = LOCAL_USER) {
  const db = getDb();
  db.transaction((tx) => {
    const ids = tx.select({ id: schema.sessions.id }).from(schema.sessions).where(eq(schema.sessions.userId, userId)).all();
    for (const { id } of ids) {
      tx.delete(schema.turns).where(eq(schema.turns.sessionId, id)).run();
      tx.delete(schema.violationLog).where(eq(schema.violationLog.sessionId, id)).run();
    }
    tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId)).run();
    tx.delete(schema.reports).where(eq(schema.reports.userId, userId)).run();
    tx.delete(schema.weaknesses).where(eq(schema.weaknesses.userId, userId)).run();
    tx.delete(schema.settings).where(eq(schema.settings.userId, userId)).run();
  });
}

/** Replace all of the user's data with an export file. */
export function importAll(data: ExportData, userId = LOCAL_USER) {
  if (data?.app !== "german-speaking" || !Array.isArray(data.sessions)) throw new Error("Not a German Speaking export file");
  deleteAll(userId);
  ensureUser(userId);
  const db = getDb();
  db.transaction((tx) => {
    for (const s of data.sessions) tx.insert(schema.sessions).values({ ...s, userId }).run();
    for (const t of data.turns ?? []) {
      const { id: _id, ...rest } = t;
      void _id;
      tx.insert(schema.turns).values(rest).run();
    }
    for (const r of data.reports ?? []) tx.insert(schema.reports).values({ ...r, userId }).run();
    for (const w of data.weaknesses ?? []) tx.insert(schema.weaknesses).values({ ...w, userId }).run();
  });
  saveSettings(data.settings ?? {}, userId);
}

export function sessionsWithTurnCounts(userId = LOCAL_USER) {
  const all = listSessions(userId);
  return all.map((s) => {
    const t = getTurns(s.id);
    return { session: s, userTurns: t.filter((x) => x.role === "user").length, turns: t };
  });
}

export function lastSessionForLevel(level: Level, userId = LOCAL_USER) {
  return getDb()
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), eq(schema.sessions.level, level)))
    .orderBy(desc(schema.sessions.startedAt))
    .get();
}
