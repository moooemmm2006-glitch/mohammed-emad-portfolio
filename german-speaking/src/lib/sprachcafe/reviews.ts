import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// ⭐ Sprachcafé reviews: only a learner who booked a session (and didn't cancel) can review it, and only
// after it ended — so every review comes from someone who was there. One review per learner and session.

export const REVIEW_MAX_COMMENT = 600;

export interface ReviewSummary {
  average: number | null;
  count: number;
}

/** ⭐ average (one decimal) and count per teacher. */
export async function teacherRatings(teacherIds: string[]): Promise<Map<string, ReviewSummary>> {
  const out = new Map<string, ReviewSummary>();
  if (!teacherIds.length) return out;
  const db = await getDb();
  const rows = await db.select({ teacherId: schema.cafeReviews.teacherId, rating: schema.cafeReviews.rating }).from(schema.cafeReviews).where(inArray(schema.cafeReviews.teacherId, teacherIds)).all();
  for (const id of teacherIds) {
    const mine = rows.filter((r) => r.teacherId === id);
    out.set(id, { count: mine.length, average: mine.length ? Math.round((10 * mine.reduce((n, r) => n + r.rating, 0)) / mine.length) / 10 : null });
  }
  return out;
}

/** The reviews of a teacher, newest first, with the reviewer's first name only and the session title. */
export async function teacherReviews(teacherId: string, limit = 30) {
  const db = await getDb();
  const rows = await db.select().from(schema.cafeReviews).where(eq(schema.cafeReviews.teacherId, teacherId)).orderBy(desc(schema.cafeReviews.createdAt)).limit(limit).all();
  const users = rows.length ? await db.select({ id: schema.users.id, name: schema.users.name, username: schema.users.username }).from(schema.users).where(inArray(schema.users.id, rows.map((r) => r.userId))).all() : [];
  const sessions = rows.length ? await db.select({ id: schema.cafeSessions.id, title: schema.cafeSessions.title, startsAt: schema.cafeSessions.startsAt }).from(schema.cafeSessions).where(inArray(schema.cafeSessions.id, rows.map((r) => r.sessionId))).all() : [];
  const names = new Map(users.map((u) => [u.id, (u.name || u.username || "").trim().split(/\s+/)[0] || "—"]));
  const titles = new Map(sessions.map((s) => [s.id, s]));
  return rows.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, name: names.get(r.userId) ?? "—", session: titles.get(r.sessionId) ?? null }));
}

/** Can this learner review this session now? */
export async function reviewEligibility(userId: string, sessionId: string, now = Date.now()): Promise<"ok" | "not_found" | "not_booked" | "not_ended" | "already"> {
  const db = await getDb();
  const session = await db.select().from(schema.cafeSessions).where(eq(schema.cafeSessions.id, sessionId)).get();
  if (!session) return "not_found";
  const booking = await db.select().from(schema.cafeBookings).where(and(eq(schema.cafeBookings.userId, userId), eq(schema.cafeBookings.sessionId, sessionId), eq(schema.cafeBookings.status, "booked"))).get();
  if (!booking || session.status === "cancelled") return "not_booked";
  if (now < session.startsAt + session.durationMinutes * 60_000) return "not_ended";
  const existing = await db.select({ id: schema.cafeReviews.id }).from(schema.cafeReviews).where(and(eq(schema.cafeReviews.userId, userId), eq(schema.cafeReviews.sessionId, sessionId))).get();
  return existing ? "already" : "ok";
}

export async function addReview(userId: string, sessionId: string, rating: number, comment: string, now = Date.now()) {
  const db = await getDb();
  const session = await db.select({ teacherId: schema.cafeSessions.teacherId }).from(schema.cafeSessions).where(eq(schema.cafeSessions.id, sessionId)).get();
  const id = `rv-${randomUUID()}`;
  await db.insert(schema.cafeReviews).values({ id, sessionId, teacherId: session!.teacherId, userId, rating: Math.max(1, Math.min(5, Math.round(rating))), comment: comment.trim().slice(0, REVIEW_MAX_COMMENT), createdAt: now }).run();
  return id;
}

/** Session ids this learner already reviewed (for "My bookings"). */
export async function reviewedSessions(userId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select({ sessionId: schema.cafeReviews.sessionId }).from(schema.cafeReviews).where(eq(schema.cafeReviews.userId, userId)).all();
  return new Set(rows.map((r) => r.sessionId));
}

export async function deleteReview(id: string) {
  const db = await getDb();
  const res = await db.delete(schema.cafeReviews).where(eq(schema.cafeReviews.id, id)).run();
  return res.rowsAffected > 0;
}
