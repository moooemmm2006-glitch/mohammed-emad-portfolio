import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "./index";
import { parseSettings, type Settings } from "../settings";
import type { StoredReport } from "../report/schema";
import type { WeaknessEntry } from "../report/weakness";

export const LOCAL_USER = "local";

export type SessionRow = typeof schema.sessions.$inferSelect;
export type TurnRow = typeof schema.turns.$inferSelect;

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
export async function getSession(id: string): Promise<SessionRow | undefined> {
  const db = await getDb();
  return db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).get();
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
export async function getTurns(sessionId: string): Promise<TurnRow[]> {
  const db = await getDb();
  return db.select().from(schema.turns).where(eq(schema.turns.sessionId, sessionId)).orderBy(asc(schema.turns.id)).all();
}

// ---------- reports ----------
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
    db.delete(schema.videoProgress).where(eq(schema.videoProgress.userId, userId)),
    db.delete(schema.skillScores).where(eq(schema.skillScores.userId, userId)),
    db.delete(schema.writingChecks).where(eq(schema.writingChecks.userId, userId)),
    db.delete(schema.geminiSessions).where(eq(schema.geminiSessions.userId, userId)),
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
