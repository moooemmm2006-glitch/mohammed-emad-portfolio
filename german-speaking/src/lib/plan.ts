import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema } from "./db";
import { TOPIC_RANGE } from "./book";
import type { Level } from "./levels";
import { PLAN_STEP_IDS, type PlanState, type PlanStepId } from "./planShared";

// Server only. The learner's level plan: when they started, which steps they ticked (with notes), and
// steps the site already knows are done (a saved text about the topic, a pasted Gemini report).

export const topicNumbersOf = (level: Level): number[] => {
  const [from, to] = TOPIC_RANGE[level];
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
};

export async function planState(userId: string, level: Level): Promise<{ start: string | null; state: PlanState }> {
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
  return { start: start?.startDay ?? null, state };
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

export async function setPlanStart(userId: string, level: Level, startDay: string | null, now = Date.now()) {
  const db = await getDb();
  if (!startDay) {
    await db.delete(schema.planStarts).where(and(eq(schema.planStarts.userId, userId), eq(schema.planStarts.level, level))).run();
    return;
  }
  await db
    .insert(schema.planStarts)
    .values({ userId, level, startDay, updatedAt: now })
    .onConflictDoUpdate({ target: [schema.planStarts.userId, schema.planStarts.level], set: { startDay, updatedAt: now } })
    .run();
}
