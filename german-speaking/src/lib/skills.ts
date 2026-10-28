import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { TOPIC_RANGE, topicSummaries } from "./book";
import { topicProgress } from "./bookProgress";
import { geminiCount, geminiSpeakBonus } from "./gemini";
import { getVideoProgress, percentOf } from "./videoProgress";
import { getVideoThema } from "./videoThema";
import type { Level } from "./levels";

// Progress per skill for a level: Sprechen (book sentences said right + Gemini sessions), Hören (videos watched),
// Lesen (section quizzes passed), Schreiben (writing exercises passed).

export type Skill = "read" | "write";
export const READ_PARTS = 5; // one quiz per section
export const WRITE_PARTS = 2; // translate (0) and complete (1)
export const PASS_AT = 80;

export async function saveSkillScore(userId: string, skill: Skill, topic: number, part: number, score: number, now = Date.now()) {
  const best = Math.max(0, Math.min(100, Math.round(score)));
  const db = await getDb();
  await db
    .insert(schema.skillScores)
    .values({ userId, skill, topic, part, best, attempts: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: [schema.skillScores.userId, schema.skillScores.skill, schema.skillScores.topic, schema.skillScores.part],
      set: { best: sql`max(${schema.skillScores.best}, ${best})`, attempts: sql`${schema.skillScores.attempts} + 1`, updatedAt: now },
    })
    .run();
}

/** Best score per topic part, e.g. { "12:3": 80 } for topic 12 section 3. */
export async function skillScores(userId: string, skill: Skill, topics: number[]): Promise<Record<string, number>> {
  if (!topics.length) return {};
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.skillScores)
    .where(and(eq(schema.skillScores.userId, userId), eq(schema.skillScores.skill, skill), inArray(schema.skillScores.topic, topics)))
    .all();
  return Object.fromEntries(rows.map((r) => [`${r.topic}:${r.part}`, r.best]));
}

export interface SkillProgress {
  speak: number;
  listen: number;
  read: number;
  write: number;
}

const pct = (a: number, b: number) => (b ? Math.min(100, Math.round((100 * a) / b)) : 0);

export async function levelSkillProgress(userId: string, level: Level): Promise<SkillProgress> {
  const topics = await topicSummaries(level);
  const numbers = topics.map((t) => t.number);
  const [speak, read, write, videos, gemini] = await Promise.all([
    topicProgress(userId, new Map(topics.map((t) => [t.number, t.sentenceCount]))),
    skillScores(userId, "read", numbers),
    skillScores(userId, "write", numbers),
    getVideoProgress(userId),
    geminiCount(userId, level),
  ]);
  const totalSentences = topics.reduce((n, t) => n + t.sentenceCount, 0);
  const saidRight = [...speak.values()].reduce((n, p) => n + p.correct, 0);
  let listen: number;
  if (level === "B2") {
    // Video-Thema: share of the latest episodes watched (the feed is cached on the server).
    const feed = await getVideoThema();
    const ids = new Set(feed.episodes.map((e) => `vt:${e.id}`));
    listen = pct(videos.filter((v) => ids.has(v.key) && v.watched).length, ids.size);
  } else {
    listen = percentOf(videos.find((v) => v.key === `nicos:${level}:movie`));
  }
  return {
    // Book sentences said right, plus a little for every Gemini conversation (its pasted report).
    speak: Math.min(100, pct(saidRight, totalSentences) + geminiSpeakBonus(gemini)),
    listen,
    read: pct(Object.values(read).filter((s) => s >= PASS_AT).length, topics.length * READ_PARTS),
    // Translate (part 0) and complete (part 1) count; free writing (part 2) is extra.
    write: pct(Object.entries(write).filter(([k, s]) => !k.endsWith(":2") && s >= PASS_AT).length, topics.length * WRITE_PARTS),
  };
}

export const isLevelTopic = (level: Level, n: number) => n >= TOPIC_RANGE[level][0] && n <= TOPIC_RANGE[level][1];
