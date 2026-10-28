import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { Level } from "./levels";

// Reports the learner pasted after talking with Gemini. Stored as plain text; no parsing.

export const GEMINI_TEXT_MAX = 20_000;
/** Each Gemini session adds this much to the level's Sprechen bar (up to GEMINI_SPEAK_MAX). */
export const GEMINI_SPEAK_POINTS = 2;
export const GEMINI_SPEAK_MAX = 20;

export interface GeminiSession {
  id: string;
  level: Level;
  topic: number | null;
  video: string | null;
  text: string;
  createdAt: number;
}

export async function saveGeminiSession(userId: string, input: { level: Level; topic?: number | null; video?: string | null; text: string }, now = Date.now()): Promise<GeminiSession> {
  const row: GeminiSession = {
    id: `g-${randomUUID()}`,
    level: input.level,
    topic: input.topic ?? null,
    video: input.video?.trim() || null,
    text: input.text.trim().slice(0, GEMINI_TEXT_MAX),
    createdAt: now,
  };
  const db = await getDb();
  await db.insert(schema.geminiSessions).values({ ...row, userId }).run();
  return row;
}

export async function listGeminiSessions(userId: string): Promise<GeminiSession[]> {
  const db = await getDb();
  const g = schema.geminiSessions;
  const rows = await db
    .select({ id: g.id, level: g.level, topic: g.topic, video: g.video, text: g.text, createdAt: g.createdAt })
    .from(g)
    .where(eq(g.userId, userId))
    .orderBy(desc(g.createdAt))
    .all();
  return rows.map((r) => ({ ...r, level: r.level as Level }));
}

export async function deleteGeminiSession(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.delete(schema.geminiSessions).where(and(eq(schema.geminiSessions.userId, userId), eq(schema.geminiSessions.id, id))).run();
  return res.rowsAffected > 0;
}

export async function geminiCount(userId: string, level: Level): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ id: schema.geminiSessions.id }).from(schema.geminiSessions).where(and(eq(schema.geminiSessions.userId, userId), eq(schema.geminiSessions.level, level))).all();
  return rows.length;
}

/** Extra Sprechen progress for a level's Gemini sessions. */
export const geminiSpeakBonus = (count: number) => Math.min(GEMINI_SPEAK_MAX, count * GEMINI_SPEAK_POINTS);
