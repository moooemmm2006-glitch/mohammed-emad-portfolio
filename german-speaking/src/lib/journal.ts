import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { Level } from "./levels";
import { saveSkillScore, WRITE_JOURNAL_PART } from "./skills";

// ✍️ "اكتب عن الموضوع": after studying a topic the learner writes about it in their own words
// (what they learned, did and remember). No questions, no translation — just their text, kept
// per topic. Reaching the level's word goal completes the topic's writing.

export const JOURNAL_GOAL: Record<Level, number> = { A1: 40, A2: 60, B1: 80, B2: 100 };
export const JOURNAL_MAX_CHARS = 5000;

export interface JournalEntry {
  id: string;
  topic: number;
  text: string;
  words: number;
  createdAt: number;
}

/** Words in a German text (numbers and punctuation don't count). */
export function countWords(text: string): number {
  return (text.match(/[\p{L}][\p{L}\p{M}'’-]*/gu) ?? []).length;
}

/** 0 … 100: how close the text is to the level's word goal. */
export const journalScore = (words: number, level: Level) => Math.min(100, Math.round((100 * words) / JOURNAL_GOAL[level]));

export async function saveJournalEntry(userId: string, input: { topic: number; level: Level; text: string }, now = Date.now()): Promise<{ entry: JournalEntry; score: number }> {
  const text = input.text.trim().slice(0, JOURNAL_MAX_CHARS);
  const words = countWords(text);
  const entry: JournalEntry = { id: `j-${randomUUID()}`, topic: input.topic, text, words, createdAt: now };
  const db = await getDb();
  await db.insert(schema.writingEntries).values({ ...entry, userId, level: input.level }).run();
  const score = journalScore(words, input.level);
  await saveSkillScore(userId, "write", input.topic, WRITE_JOURNAL_PART, score, now);
  return { entry, score };
}

/** The learner's texts about one topic, newest first. */
export async function journalEntries(userId: string, topic: number, limit = 20): Promise<JournalEntry[]> {
  const db = await getDb();
  return db
    .select({ id: schema.writingEntries.id, topic: schema.writingEntries.topic, text: schema.writingEntries.text, words: schema.writingEntries.words, createdAt: schema.writingEntries.createdAt })
    .from(schema.writingEntries)
    .where(and(eq(schema.writingEntries.userId, userId), eq(schema.writingEntries.topic, topic)))
    .orderBy(desc(schema.writingEntries.createdAt))
    .limit(limit)
    .all();
}
