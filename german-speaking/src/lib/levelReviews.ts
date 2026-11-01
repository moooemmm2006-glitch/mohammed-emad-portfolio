import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Level } from "@/lib/levels";
import { levelSkillProgress } from "@/lib/skills";

// 💬 What learners say about a level ("آراء الطلاب"): stars + a few lines, one per learner and level.
// Only a learner who really worked on the level can write one, and it shows only after the admin
// approves it (editing sends it back to review). Shown with the first name only.

export const LEVEL_REVIEW_MIN_PROGRESS = 25; // % of the level (average of the four skills)
export const LEVEL_REVIEW_MIN = 10;
export const LEVEL_REVIEW_MAX = 400;
export type LevelReviewStatus = "pending" | "approved" | "rejected";

const firstName = (u?: { name: string | null; username: string | null }) => (u?.name || u?.username || "").trim().split(/\s+/)[0] || "—";

export async function levelProgressPercent(userId: string, level: Level) {
  const p = await levelSkillProgress(userId, level);
  return Math.round((p.speak + p.listen + p.read + p.write) / 4);
}

async function withNames<T extends { userId: string }>(rows: T[]) {
  if (!rows.length) return [];
  const db = await getDb();
  const users = await db.select({ id: schema.users.id, name: schema.users.name, username: schema.users.username }).from(schema.users).where(inArray(schema.users.id, [...new Set(rows.map((r) => r.userId))])).all();
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({ ...r, name: firstName(byId.get(r.userId)) }));
}

/** Approved opinions of a level, newest first, plus the average. */
export async function approvedLevelReviews(level: Level, limit = 40) {
  const db = await getDb();
  const rows = await db.select().from(schema.levelReviews).where(and(eq(schema.levelReviews.level, level), eq(schema.levelReviews.status, "approved"))).orderBy(desc(schema.levelReviews.updatedAt)).all();
  const average = rows.length ? Math.round((10 * rows.reduce((n, r) => n + r.rating, 0)) / rows.length) / 10 : null;
  const named = await withNames(rows.slice(0, limit));
  return { average, count: rows.length, reviews: named.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, name: r.name, level: r.level, at: r.updatedAt })) };
}

export async function myLevelReview(userId: string, level: Level) {
  const db = await getDb();
  return (await db.select().from(schema.levelReviews).where(and(eq(schema.levelReviews.userId, userId), eq(schema.levelReviews.level, level))).get()) ?? null;
}

/** Write or rewrite my opinion; it goes (back) to the admin's review. */
export async function saveLevelReview(userId: string, level: Level, rating: number, comment: string, now = Date.now()) {
  const db = await getDb();
  const existing = await myLevelReview(userId, level);
  const values = { rating: Math.max(1, Math.min(5, Math.round(rating))), comment: comment.trim().slice(0, LEVEL_REVIEW_MAX), status: "pending" as const, updatedAt: now };
  if (existing) {
    await db.update(schema.levelReviews).set(values).where(eq(schema.levelReviews.id, existing.id)).run();
    return existing.id;
  }
  const id = `lr-${randomUUID()}`;
  await db.insert(schema.levelReviews).values({ id, userId, level, createdAt: now, ...values }).run();
  return id;
}

export async function deleteMyLevelReview(userId: string, level: Level) {
  const db = await getDb();
  const res = await db.delete(schema.levelReviews).where(and(eq(schema.levelReviews.userId, userId), eq(schema.levelReviews.level, level))).run();
  return res.rowsAffected > 0;
}

/** Admin: the opinions waiting for a decision (oldest first) or all of one status. */
export async function levelReviewsByStatus(status: LevelReviewStatus, limit = 100) {
  const db = await getDb();
  const rows = await db.select().from(schema.levelReviews).where(eq(schema.levelReviews.status, status)).orderBy(status === "pending" ? schema.levelReviews.updatedAt : desc(schema.levelReviews.updatedAt)).limit(limit).all();
  return (await withNames(rows)).map((r) => ({ id: r.id, level: r.level, rating: r.rating, comment: r.comment, name: r.name, status: r.status, at: r.updatedAt }));
}

export async function setLevelReviewStatus(id: string, status: LevelReviewStatus) {
  const db = await getDb();
  const res = await db.update(schema.levelReviews).set({ status }).where(eq(schema.levelReviews.id, id)).run();
  return res.rowsAffected > 0;
}

export async function deleteLevelReview(id: string) {
  const db = await getDb();
  const res = await db.delete(schema.levelReviews).where(eq(schema.levelReviews.id, id)).run();
  return res.rowsAffected > 0;
}
