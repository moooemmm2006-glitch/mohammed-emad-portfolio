import { and, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { UserRow } from "./auth/users";

// Daily usage per learner (partner replies and conversation time), checked against the
// limits an admin can set per student. A "day" follows USAGE_TZ (default Africa/Cairo).

/** Time between two turns counts as speaking time, but at most this much (a break doesn't count). */
export const MAX_GAP_MS = 2 * 60 * 1000;

export function usageDay(now = Date.now(), tz = process.env.USAGE_TZ || "Africa/Cairo"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return new Date(now).toISOString().slice(0, 10);
  }
}

export interface UsageToday {
  day: string;
  replies: number;
  minutes: number;
}

export async function getUsage(userId: string, now = Date.now()): Promise<UsageToday> {
  const day = usageDay(now);
  const db = await getDb();
  const row = await db.select().from(schema.usage).where(and(eq(schema.usage.userId, userId), eq(schema.usage.day, day))).get();
  return { day, replies: row?.replies ?? 0, minutes: Math.round(((row?.ms ?? 0) / 60_000) * 10) / 10 };
}

export type LimitHit = { kind: "replies" | "minutes"; limit: number } | null;

/** Which daily limit (if any) this user has already reached. Admins have no limits. */
export async function limitReached(user: Pick<UserRow, "id" | "role" | "dailyMinutes" | "dailyReplies">, now = Date.now()): Promise<LimitHit> {
  if (user.role === "admin" || (!user.dailyMinutes && !user.dailyReplies)) return null;
  const u = await getUsage(user.id, now);
  if (user.dailyReplies && u.replies >= user.dailyReplies) return { kind: "replies", limit: user.dailyReplies };
  if (user.dailyMinutes && u.minutes >= user.dailyMinutes) return { kind: "minutes", limit: user.dailyMinutes };
  return null;
}

export async function recordUsage(userId: string, add: { replies?: number; ms?: number }, now = Date.now()) {
  const replies = add.replies ?? 0;
  const ms = Math.max(0, Math.round(add.ms ?? 0));
  const db = await getDb();
  await db
    .insert(schema.usage)
    .values({ userId, day: usageDay(now), replies, ms })
    .onConflictDoUpdate({
      target: [schema.usage.userId, schema.usage.day],
      set: { replies: sql`${schema.usage.replies} + ${replies}`, ms: sql`${schema.usage.ms} + ${ms}` },
    })
    .run();
}

/** Minutes of conversation per user over the last 7 days (admin overview). */
export async function minutesThisWeek(now = Date.now()): Promise<Map<string, number>> {
  const since = usageDay(now - 6 * 24 * 60 * 60 * 1000);
  const db = await getDb();
  const rows = await db
    .select({ userId: schema.usage.userId, ms: sql<number>`sum(${schema.usage.ms})` })
    .from(schema.usage)
    .where(gte(schema.usage.day, since))
    .groupBy(schema.usage.userId)
    .all();
  return new Map(rows.map((r) => [r.userId, Math.round(Number(r.ms) / 60_000)]));
}
