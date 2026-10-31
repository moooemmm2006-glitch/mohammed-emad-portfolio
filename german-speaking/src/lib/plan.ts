import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "./db";
import { levelOfTopic, sentencesByNumber, TOPIC_RANGE } from "./book";
import type { Level } from "./levels";
import { currentIndex, PLAN_STEP_IDS, type PlanState, type PlanStepId } from "./planShared";

// Server only. The learner's level plan: when they started, which steps they ticked (with notes), and
// steps the site already knows are done (a saved text about the topic, a pasted Gemini report).

export const topicNumbersOf = (level: Level): number[] => {
  const [from, to] = TOPIC_RANGE[level];
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
};

export async function planState(userId: string, level: Level): Promise<{ start: string | null; agreed: boolean; state: PlanState }> {
  const topics = topicNumbersOf(level);
  const db = await getDb();
  const [start, rows, written, talked] = await Promise.all([
    db.select().from(schema.planStarts).where(and(eq(schema.planStarts.userId, userId), eq(schema.planStarts.level, level))).get(),
    db.select().from(schema.planSteps).where(and(eq(schema.planSteps.userId, userId), inArray(schema.planSteps.topic, topics))).all(),
    db.selectDistinct({ topic: schema.writingEntries.topic }).from(schema.writingEntries).where(and(eq(schema.writingEntries.userId, userId), inArray(schema.writingEntries.topic, topics))).all(),
    db
      .selectDistinct({ topic: schema.geminiSessions.topic })
      .from(schema.geminiSessions)
      .where(and(eq(schema.geminiSessions.userId, userId), isNotNull(schema.geminiSessions.topic), inArray(schema.geminiSessions.topic, topics)))
      .all(),
  ]);
  const state: PlanState = {};
  const set = (topic: number, step: PlanStepId, done: boolean, note?: string | null, auto = false) => {
    const t = (state[topic] ??= {});
    const prev = t[step];
    t[step] = { done: done || Boolean(prev?.done), note: note ?? prev?.note ?? null, auto: auto || Boolean(prev?.auto) };
  };
  for (const r of rows) if ((PLAN_STEP_IDS as string[]).includes(r.step)) set(r.topic, r.step as PlanStepId, Boolean(r.done), r.note);
  // What the site already knows: a saved text about the topic, a Gemini report pasted for it.
  for (const w of written) set(w.topic, "write", true, undefined, true);
  for (const g of talked) if (g.topic != null) set(g.topic, "gemini", true, undefined, true);
  return { start: start?.startDay ?? null, agreed: start?.agreedAt != null, state };
}

export interface TopicLock {
  locked: boolean;
  level: Level;
  /** The topic that has to be finished first (when locked). */
  openTopic: number | null;
}

/**
 * In order: once the learner agreed to the plan of a level, a topic opens only when every topic before it
 * is done (all six steps). Before agreeing, every topic is open to look around.
 */
export async function topicLock(userId: string, topic: number): Promise<TopicLock | null> {
  const level = levelOfTopic(topic);
  if (!level) return null;
  const { agreed, state } = await planState(userId, level);
  if (!agreed) return { locked: false, level, openTopic: null };
  const order = topicNumbersOf(level);
  const current = currentIndex(state, order);
  const locked = current >= 0 && order.indexOf(topic) > current;
  return { locked, level, openTopic: locked ? order[current] : null };
}

/** The first locked topic among these (for routes that get several topics or sentences at once). */
export async function firstLocked(userId: string, topics: Iterable<number>): Promise<TopicLock | null> {
  for (const t of new Set(topics)) {
    const lock = await topicLock(userId, t);
    if (lock?.locked) return lock;
  }
  return null;
}

/** Locked topics behind these book sentences, if any. */
export async function lockedBySentences(userId: string, ns: number[]): Promise<TopicLock | null> {
  const found = await sentencesByNumber(ns);
  return firstLocked(userId, [...found.values()].map((s) => s.topic));
}

export async function setPlanStep(userId: string, topic: number, step: PlanStepId, patch: { done?: boolean; note?: string | null }, now = Date.now()) {
  const db = await getDb();
  const prev = await db.select().from(schema.planSteps).where(and(eq(schema.planSteps.userId, userId), eq(schema.planSteps.topic, topic), eq(schema.planSteps.step, step))).get();
  const done = patch.done === undefined ? (prev?.done ?? 0) : patch.done ? 1 : 0;
  const note = patch.note === undefined ? (prev?.note ?? null) : patch.note?.trim() ? patch.note.trim().slice(0, 2000) : null;
  await db
    .insert(schema.planSteps)
    .values({ userId, topic, step, done, note, updatedAt: now })
    .onConflictDoUpdate({ target: [schema.planSteps.userId, schema.planSteps.topic, schema.planSteps.step], set: { done, note, updatedAt: now } })
    .run();
}

/**
 * Start (or move) the plan of a level. `agree` = the learner accepted to go in order; that can't be taken
 * back, and an agreed plan can't be removed (only its start day can move).
 */
export async function setPlanStart(userId: string, level: Level, startDay: string | null, agree = false, now = Date.now()): Promise<"ok" | "locked_in"> {
  const db = await getDb();
  const prev = await db.select().from(schema.planStarts).where(and(eq(schema.planStarts.userId, userId), eq(schema.planStarts.level, level))).get();
  if (!startDay) {
    if (prev?.agreedAt != null) return "locked_in";
    await db.delete(schema.planStarts).where(and(eq(schema.planStarts.userId, userId), eq(schema.planStarts.level, level))).run();
    return "ok";
  }
  const agreedAt = prev?.agreedAt ?? (agree ? now : null);
  await db
    .insert(schema.planStarts)
    .values({ userId, level, startDay, updatedAt: now, agreedAt })
    .onConflictDoUpdate({ target: [schema.planStarts.userId, schema.planStarts.level], set: { startDay, updatedAt: now, agreedAt } })
    .run();
  return "ok";
}

/** 403 for a topic that opens later in the learner's plan; the message is the topic to finish first. */
export const lockedResponse = (lock: TopicLock) =>
  NextResponse.json({ error: { code: "topic_locked", message: String(lock.openTopic ?? ""), openTopic: lock.openTopic } }, { status: 403 });
