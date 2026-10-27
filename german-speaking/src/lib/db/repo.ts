import { and, asc, desc, eq, inArray } from "drizzle-orm";
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
  /** Guided book conversation: the book sentence number the partner asked about. */
  bookQ?: number;
  /** Learner turn in a guided book conversation: closest book sentence and its score. */
  book?: { n: number; score: number };
}

export async function ensureUser(userId: string) {
  const db = await getDb();
  await db.insert(schema.users).values({ id: userId, name: null, createdAt: Date.now() }).onConflictDoNothing().run();
}

// ---------- settings ----------
export async function getSettings(userId: string): Promise<Settings> {
  const db = await getDb();
  const row = await db.select().from(schema.settings).where(eq(schema.settings.userId, userId)).get();
  return parseSettings(row ? JSON.parse(row.json) : {});
}

export async function saveSettings(patch: Partial<Settings>, userId: string): Promise<Settings> {
  await ensureUser(userId);
  const merged = parseSettings({ ...(await getSettings(userId)), ...patch });
  const json = JSON.stringify(merged);
  const db = await getDb();
  await db.insert(schema.settings).values({ userId, json }).onConflictDoUpdate({ target: schema.settings.userId, set: { json } }).run();
  return merged;
}

// ---------- sessions ----------
export async function createSession(level: Level, topic: string | null, focusTag: string | null, userId: string, bookTopic: number | null = null): Promise<SessionRow> {
  await ensureUser(userId);
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
    bookTopic,
  };
  const db = await getDb();
  await db.insert(schema.sessions).values(row).run();
  return row;
}

export async function getSession(id: string): Promise<SessionRow | undefined> {
  const db = await getDb();
  return db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).get();
}

export async function updateSession(id: string, patch: Partial<SessionRow>) {
  const db = await getDb();
  await db.update(schema.sessions).set(patch).where(eq(schema.sessions.id, id)).run();
}

export async function listSessions(userId: string): Promise<SessionRow[]> {
  const db = await getDb();
  return db.select().from(schema.sessions).where(eq(schema.sessions.userId, userId)).orderBy(desc(schema.sessions.startedAt)).all();
}

export async function deleteSession(id: string) {
  const db = await getDb();
  await db.batch([
    db.delete(schema.turns).where(eq(schema.turns.sessionId, id)),
    db.delete(schema.reports).where(eq(schema.reports.sessionId, id)),
    db.delete(schema.violationLog).where(eq(schema.violationLog.sessionId, id)),
    db.delete(schema.sessions).where(eq(schema.sessions.id, id)),
  ]);
}

// ---------- turns ----------
export async function addTurn(
  sessionId: string,
  role: "user" | "partner",
  text: string,
  opts: { confidence?: number | null; meta?: TurnMeta; at?: number } = {},
): Promise<TurnRow> {
  const at = opts.at ?? Date.now();
  const db = await getDb();
  const row = await db
    .insert(schema.turns)
    .values({ sessionId, role, text, createdAt: at, confidence: opts.confidence ?? null, meta: opts.meta ? JSON.stringify(opts.meta) : null })
    .returning()
    .get();
  await updateSession(sessionId, { lastActiveAt: at });
  return row;
}

export async function getTurns(sessionId: string): Promise<TurnRow[]> {
  const db = await getDb();
  return db.select().from(schema.turns).where(eq(schema.turns.sessionId, sessionId)).orderBy(asc(schema.turns.id)).all();
}

export function parseMeta(t: TurnRow): TurnMeta {
  try {
    return t.meta ? (JSON.parse(t.meta) as TurnMeta) : {};
  } catch {
    return {};
  }
}

// ---------- reports ----------
export async function saveReport(report: StoredReport, userId: string) {
  const json = JSON.stringify(report);
  const values = { sessionId: report.session.sessionId, userId, createdAt: Date.now(), language: report.language, overall: report.overall, json };
  const db = await getDb();
  await db
    .insert(schema.reports)
    .values(values)
    .onConflictDoUpdate({ target: schema.reports.sessionId, set: { json, overall: values.overall, language: values.language, createdAt: values.createdAt } })
    .run();
  await updateSession(report.session.sessionId, { status: "reported" });
}

export async function getReport(sessionId: string): Promise<StoredReport | null> {
  const db = await getDb();
  const row = await db.select().from(schema.reports).where(eq(schema.reports.sessionId, sessionId)).get();
  return row ? (JSON.parse(row.json) as StoredReport) : null;
}

/** Reports ordered oldest → newest by session date. */
export async function listReports(userId: string): Promise<StoredReport[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.reports).where(eq(schema.reports.userId, userId)).all();
  return rows.map((r) => JSON.parse(r.json) as StoredReport).sort((a, b) => a.session.date.localeCompare(b.session.date));
}

// ---------- weaknesses ----------
export async function getWeaknesses(userId: string): Promise<WeaknessEntry[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.weaknesses).where(eq(schema.weaknesses.userId, userId)).all();
  return rows.map((r) => ({
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

export async function saveWeaknesses(entries: WeaknessEntry[], userId: string) {
  const db = await getDb();
  // One batch = one transaction, so the tracker is never left half-written.
  await db.batch([
    db.delete(schema.weaknesses).where(eq(schema.weaknesses.userId, userId)),
    ...entries.map((e) =>
      db.insert(schema.weaknesses).values({
        userId,
        tag: e.tag,
        kind: e.kind,
        firstSeen: e.firstSeen,
        lastSeen: e.lastSeen,
        status: e.status,
        totalCount: e.totalCount,
        absentStreak: e.absentStreak,
        history: JSON.stringify(e.history),
      }),
    ),
  ]);
}

// ---------- violation log ----------
export async function logViolation(sessionId: string, level: string, attempt: number, violations: unknown) {
  const db = await getDb();
  await db.insert(schema.violationLog).values({ sessionId, level, attempt, violations: JSON.stringify(violations), createdAt: Date.now() }).run();
}

// ---------- export / import / delete ----------
export const EXPORT_VERSION = 1;

export async function exportAll(userId: string) {
  const db = await getDb();
  const sessionRows = await listSessions(userId);
  const turnRows = await turnsForSessions(sessionRows.map((s) => s.id));
  return {
    app: "german-speaking" as const,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: await getSettings(userId),
    sessions: sessionRows,
    turns: turnRows,
    reports: await db.select().from(schema.reports).where(eq(schema.reports.userId, userId)).all(),
    weaknesses: await db.select().from(schema.weaknesses).where(eq(schema.weaknesses.userId, userId)).all(),
  };
}

export type ExportData = Awaited<ReturnType<typeof exportAll>>;

export async function deleteAll(userId: string) {
  const db = await getDb();
  const ids = (await db.select({ id: schema.sessions.id }).from(schema.sessions).where(eq(schema.sessions.userId, userId)).all()).map((r) => r.id);
  await db.batch([
    db.delete(schema.turns).where(inArray(schema.turns.sessionId, ids)),
    db.delete(schema.violationLog).where(inArray(schema.violationLog.sessionId, ids)),
    db.delete(schema.sessions).where(eq(schema.sessions.userId, userId)),
    db.delete(schema.reports).where(eq(schema.reports.userId, userId)),
    db.delete(schema.weaknesses).where(eq(schema.weaknesses.userId, userId)),
    db.delete(schema.settings).where(eq(schema.settings.userId, userId)),
    db.delete(schema.bookProgress).where(eq(schema.bookProgress.userId, userId)),
    db.delete(schema.bookPractice).where(eq(schema.bookPractice.userId, userId)),
  ]);
}

/** Replace all of the user's data with an export file. */
export async function importAll(data: ExportData, userId: string) {
  if (data?.app !== "german-speaking" || !Array.isArray(data.sessions)) throw new Error("Not a German Speaking export file");
  await deleteAll(userId);
  await ensureUser(userId);
  const db = await getDb();
  const inserts = [
    ...data.sessions.map((s) => db.insert(schema.sessions).values({ ...s, userId })),
    ...(data.turns ?? []).map(({ id: _id, ...rest }) => (void _id, db.insert(schema.turns).values(rest))),
    ...(data.reports ?? []).map((r) => db.insert(schema.reports).values({ ...r, userId })),
    ...(data.weaknesses ?? []).map((w) => db.insert(schema.weaknesses).values({ ...w, userId })),
  ];
  if (inserts.length) await db.batch(inserts as [(typeof inserts)[number], ...(typeof inserts)[number][]]);
  await saveSettings(data.settings ?? {}, userId);
}

/** All turns of many sessions in one query (one round trip matters with a remote database). */
async function turnsForSessions(ids: string[]): Promise<TurnRow[]> {
  if (!ids.length) return [];
  const db = await getDb();
  return db.select().from(schema.turns).where(inArray(schema.turns.sessionId, ids)).orderBy(asc(schema.turns.id)).all();
}

export async function sessionsWithTurnCounts(userId: string) {
  const all = await listSessions(userId);
  const bySession = new Map<string, TurnRow[]>();
  for (const t of await turnsForSessions(all.map((s) => s.id))) {
    const list = bySession.get(t.sessionId) ?? [];
    list.push(t);
    bySession.set(t.sessionId, list);
  }
  return all.map((s) => {
    const t = bySession.get(s.id) ?? [];
    return { session: s, userTurns: t.filter((x) => x.role === "user").length, turns: t };
  });
}

export async function lastSessionForLevel(level: Level, userId: string) {
  const db = await getDb();
  return db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), eq(schema.sessions.level, level)))
    .orderBy(desc(schema.sessions.startedAt))
    .get();
}
