import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { badgesFor, FOCUS_MAX, focusStreak, newBadges, type BadgeId, type FocusStats } from "./focusShared";
import type { Level } from "./levels";
import { dayKey } from "./stats";

export type { FocusStats };

// Server only. Finished ⏱️ focus sessions and the "خزنتي" (my vault) stats.

type Row = typeof schema.focusSessions.$inferSelect;

async function rowsOf(userId: string): Promise<Row[]> {
  const db = await getDb();
  return db.select().from(schema.focusSessions).where(eq(schema.focusSessions.userId, userId)).all();
}

export function statsFromRows(rows: Pick<Row, "endedAt" | "minutes">[], tzOffsetMin: number, now = Date.now()): FocusStats {
  const perDay = new Map<string, number>();
  for (const r of rows) {
    const k = dayKey(r.endedAt, tzOffsetMin);
    perDay.set(k, (perDay.get(k) ?? 0) + r.minutes);
  }
  const today = dayKey(now, tzOffsetMin);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = dayKey(now - (6 - i) * 86_400_000, tzOffsetMin);
    return { day, minutes: perDay.get(day) ?? 0 };
  });
  const totalMinutes = rows.reduce((n, r) => n + r.minutes, 0);
  return {
    totalMinutes,
    todayMinutes: perDay.get(today) ?? 0,
    weekMinutes: last7.reduce((n, d) => n + d.minutes, 0),
    streak: focusStreak(new Set(perDay.keys()), today),
    last7,
    badges: badgesFor(totalMinutes),
    sessions: rows.length,
  };
}

export async function focusStats(userId: string, tzOffsetMin = 0, now = Date.now()): Promise<FocusStats> {
  return statsFromRows(await rowsOf(userId), tzOffsetMin, now);
}

/**
 * Save a finished focus session. The length is checked against the clock (it can't be longer than the
 * time since it started), so the vault only holds real study time.
 */
export async function saveFocusSession(
  userId: string,
  input: { startedAt: number; minutes: number; goal?: string | null; level?: Level | null },
  tzOffsetMin = 0,
  now = Date.now(),
): Promise<{ id: string; stats: FocusStats; newBadges: BadgeId[] }> {
  const elapsedMin = Math.floor((now - input.startedAt) / 60_000 + 0.5);
  const minutes = Math.max(1, Math.min(FOCUS_MAX, Math.round(input.minutes), elapsedMin));
  const before = (await rowsOf(userId)).reduce((n, r) => n + r.minutes, 0);
  const id = `f-${randomUUID()}`;
  const db = await getDb();
  await db
    .insert(schema.focusSessions)
    .values({ id, userId, startedAt: input.startedAt, endedAt: now, minutes, goal: input.goal?.trim().slice(0, 140) || null, goalDone: null, level: input.level ?? null })
    .run();
  const stats = await focusStats(userId, tzOffsetMin, now);
  return { id, stats, newBadges: newBadges(before, stats.totalMinutes) };
}

export async function setGoalDone(userId: string, id: string, done: boolean): Promise<boolean> {
  const db = await getDb();
  const res = await db
    .update(schema.focusSessions)
    .set({ goalDone: done ? 1 : 0 })
    .where(and(eq(schema.focusSessions.userId, userId), eq(schema.focusSessions.id, id)))
    .run();
  return res.rowsAffected > 0;
}

/** Focus minutes done on a level's pages (shown as study time on the level page). */
export async function levelFocusMinutes(userId: string, level: Level): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ minutes: schema.focusSessions.minutes })
    .from(schema.focusSessions)
    .where(and(eq(schema.focusSessions.userId, userId), eq(schema.focusSessions.level, level)))
    .all();
  return rows.reduce((n, r) => n + r.minutes, 0);
}
