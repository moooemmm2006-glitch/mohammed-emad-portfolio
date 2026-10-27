import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb, schema } from "./db";
import { CORRECT_AT } from "./bookCompare";

// Per-user progress on the book: best score per sentence, finished topics, and spaced review
// ("راجع بعد يوم، 3 أيام، أسبوع"): a sentence said wrong comes back after 1 day, then 3, then 7.

const DAY = 24 * 60 * 60 * 1000;
export const REVIEW_DAYS = [1, 3, 7];
/** A topic counts as finished when this share of its sentences was said correctly at least once. */
export const TOPIC_DONE_SHARE = 0.8;

export interface Attempt {
  n: number;
  topic: number;
  score: number;
}

/** Due a little before the same time of day, so yesterday evening's mistakes are there this morning. */
const dueIn = (days: number, now: number) => now + days * DAY - 6 * 60 * 60 * 1000;

type Row = typeof schema.bookProgress.$inferSelect;

/** Save one or more attempts (best of the batch per sentence) and update the review schedule. */
export async function recordAttempts(userId: string, attempts: Attempt[], now = Date.now()) {
  const byN = new Map<number, Attempt>();
  for (const a of attempts) {
    const prev = byN.get(a.n);
    if (!prev || a.score > prev.score) byN.set(a.n, { ...a, score: Math.max(0, Math.min(100, Math.round(a.score))) });
  }
  if (!byN.size) return;
  const db = await getDb();
  const existing = new Map(
    (await db.select().from(schema.bookProgress).where(and(eq(schema.bookProgress.userId, userId), inArray(schema.bookProgress.n, [...byN.keys()]))).all()).map((r) => [r.n, r]),
  );
  const rows: Row[] = [...byN.values()].map((a) => {
    const old = existing.get(a.n);
    const ok = a.score >= CORRECT_AT;
    let reviewStage = old?.reviewStage ?? null;
    let dueAt = old?.dueAt ?? null;
    if (!ok) {
      reviewStage = 0;
      dueAt = dueIn(REVIEW_DAYS[0], now);
    } else if (reviewStage !== null && dueAt !== null && dueAt <= now) {
      // A due review said correctly moves to the next interval; after a week it's learned.
      reviewStage += 1;
      if (reviewStage >= REVIEW_DAYS.length) {
        reviewStage = null;
        dueAt = null;
      } else dueAt = dueIn(REVIEW_DAYS[reviewStage], now);
    }
    return {
      userId,
      n: a.n,
      topic: a.topic,
      best: Math.max(old?.best ?? 0, a.score),
      attempts: (old?.attempts ?? 0) + 1,
      correct: (old?.correct ?? 0) + (ok ? 1 : 0),
      lastAt: now,
      reviewStage,
      dueAt,
    };
  });
  const ops = rows.map((r) =>
    db
      .insert(schema.bookProgress)
      .values(r)
      .onConflictDoUpdate({
        target: [schema.bookProgress.userId, schema.bookProgress.n],
        set: { best: r.best, attempts: r.attempts, correct: r.correct, lastAt: r.lastAt, reviewStage: r.reviewStage, dueAt: r.dueAt, topic: r.topic },
      }),
  );
  await db.batch(ops as [(typeof ops)[number], ...(typeof ops)[number][]]);
}

export interface TopicProgress {
  practiced: number;
  correct: number;
  total: number;
  done: boolean;
}

/** Progress per topic for this user (only topics with at least one attempt are in the map). */
export async function topicProgress(userId: string, totals: Map<number, number>): Promise<Map<number, TopicProgress>> {
  const db = await getDb();
  const rows = await db
    .select({ topic: schema.bookProgress.topic, best: schema.bookProgress.best })
    .from(schema.bookProgress)
    .where(and(eq(schema.bookProgress.userId, userId), inArray(schema.bookProgress.topic, [...totals.keys()])))
    .all();
  const out = new Map<number, TopicProgress>();
  for (const r of rows) {
    const total = totals.get(r.topic) ?? 100;
    const p = out.get(r.topic) ?? { practiced: 0, correct: 0, total, done: false };
    p.practiced++;
    if (r.best >= CORRECT_AT) p.correct++;
    p.done = p.correct >= Math.ceil(total * TOPIC_DONE_SHARE);
    out.set(r.topic, p);
  }
  return out;
}

/** Best score per sentence of one topic. */
export async function sentenceScores(userId: string, topic: number): Promise<Record<number, number>> {
  const db = await getDb();
  const rows = await db
    .select({ n: schema.bookProgress.n, best: schema.bookProgress.best })
    .from(schema.bookProgress)
    .where(and(eq(schema.bookProgress.userId, userId), eq(schema.bookProgress.topic, topic)))
    .all();
  return Object.fromEntries(rows.map((r) => [r.n, r.best]));
}

/** Sentences due for review now, oldest first. */
export async function dueReview(userId: string, now = Date.now(), limit = 30) {
  const db = await getDb();
  return db
    .select({ n: schema.bookProgress.n, topic: schema.bookProgress.topic, best: schema.bookProgress.best, stage: schema.bookProgress.reviewStage, dueAt: schema.bookProgress.dueAt })
    .from(schema.bookProgress)
    .where(and(eq(schema.bookProgress.userId, userId), isNotNull(schema.bookProgress.dueAt), lte(schema.bookProgress.dueAt, now)))
    .orderBy(asc(schema.bookProgress.dueAt))
    .limit(limit)
    .all();
}

// ---------- practice runs (for their report) ----------
export interface PracticeResult {
  n: number;
  topic: number;
  de: string;
  ar: string;
  said: string;
  score: number;
  missed: string[];
  grammar?: { title_de: string; title_ar: string; formula: string } | null;
}

export interface PracticeRecord {
  id: string;
  topic: number | null;
  mode: "shadow" | "reverse" | "review" | "grammar";
  createdAt: number;
  results: PracticeResult[];
}

export async function savePractice(userId: string, rec: Omit<PracticeRecord, "id" | "createdAt">, now = Date.now()): Promise<PracticeRecord> {
  const full: PracticeRecord = { ...rec, id: randomUUID(), createdAt: now };
  const db = await getDb();
  await db.insert(schema.bookPractice).values({ id: full.id, userId, topic: rec.topic, mode: rec.mode, createdAt: now, json: JSON.stringify(full) }).run();
  return full;
}

export async function getPractice(userId: string, id: string): Promise<PracticeRecord | null> {
  const db = await getDb();
  const row = await db.select().from(schema.bookPractice).where(and(eq(schema.bookPractice.id, id), eq(schema.bookPractice.userId, userId))).get();
  return row ? (JSON.parse(row.json) as PracticeRecord) : null;
}

export async function listPractice(userId: string, limit = 20) {
  const db = await getDb();
  const rows = await db.select().from(schema.bookPractice).where(eq(schema.bookPractice.userId, userId)).all();
  return rows
    .map((r) => JSON.parse(r.json) as PracticeRecord)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
