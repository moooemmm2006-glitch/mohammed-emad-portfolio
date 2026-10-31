import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { TOPIC_RANGE, topicSummaries } from "./book";
import { topicProgress } from "./bookProgress";
import { geminiCount, geminiSpeakBonus } from "./gemini";
import { getVideoProgress } from "./videoProgress";
import { getVideoThema } from "./videoThema";
import { LEVELS, type Level } from "./levels";
import { easyGermanProgress } from "./easyGerman";
import { listPodcasts } from "./podcasts";
import { listFilms } from "./films";
import { podcastProgressKey } from "./podcastShared";
import { filmProgressKey } from "./filmsShared";
import { readingProgressBonus } from "./readingShared";

// Progress per skill for a level: Sprechen (book sentences said right + Gemini sessions), Hören (videos watched),
// Lesen (section quizzes passed), Schreiben (writing exercises passed).

export type Skill = "read" | "write";
export const READ_PARTS = 5; // one quiz per section
export const WRITE_PARTS = 2; // older exercises: translate (0) and complete (1)
/** ✍️ Writing about the topic in your own words (reaching the level's word goal = 100). */
export const WRITE_JOURNAL_PART = 3;
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

export interface ListeningProgress {
  watched: number;
  total: number;
}

const pct = (a: number, b: number) => (b ? Math.min(100, Math.round((100 * a) / b)) : 0);

const topicsForProgress = () => Object.fromEntries(LEVELS.map((l) => {
  const [from, to] = TOPIC_RANGE[l];
  return [l, Array.from({ length: to - from + 1 }, (_, i) => from + i)];
})) as Record<Level, number[]>;

/** Hören completion counts all media available in a level, with legacy A1/A2 behavior preserved. */
export async function levelListeningProgress(userId: string, level: Level, videoRows?: Awaited<ReturnType<typeof getVideoProgress>>): Promise<ListeningProgress> {
  const videos = videoRows ?? await getVideoProgress(userId);
  const watchedKeys = new Set(videos.filter((v) => v.watched).map((v) => v.key));
  if (level === "A1" || level === "A2") {
    const movie = videos.find((v) => v.key === `nicos:${level}:movie`);
    return { watched: movie?.watched ? 1 : 0, total: 1 };
  }

  const [easyGerman, podcasts] = await Promise.all([easyGermanProgress(watchedKeys, topicsForProgress()), listPodcasts(level)]);
  let watched = easyGerman[level].watched + podcasts.filter((p) => watchedKeys.has(podcastProgressKey(p))).length;
  let total = easyGerman[level].total + podcasts.length;
  if (level === "B1") {
    total += 1;
    if (watchedKeys.has("nicos:B1:movie")) watched += 1;
  } else {
    const [feed, availableFilms] = await Promise.all([getVideoThema(), listFilms()]);
    total += feed.episodes.length + availableFilms.length;
    watched += feed.episodes.filter((episode) => watchedKeys.has(`vt:${episode.id}`)).length;
    watched += availableFilms.filter((film) => watchedKeys.has(filmProgressKey(film.id))).length;
  }
  return { watched, total };
}

/** 0 … 1 for one topic's writing. */
export function writeCredit(scores: Record<string, number>, topic: number): number {
  if ((scores[`${topic}:${WRITE_JOURNAL_PART}`] ?? 0) >= PASS_AT) return 1;
  return [0, 1].filter((p) => (scores[`${topic}:${p}`] ?? 0) >= PASS_AT).length / WRITE_PARTS;
}

export async function levelSkillProgress(userId: string, level: Level, listening?: ListeningProgress): Promise<SkillProgress> {
  const topics = await topicSummaries(level);
  const numbers = topics.map((t) => t.number);
  const [speak, read, write, gemini, listeningProgress, pageBook] = await Promise.all([
    topicProgress(userId, new Map(topics.map((t) => [t.number, t.sentenceCount]))),
    skillScores(userId, "read", numbers),
    skillScores(userId, "write", numbers),
    geminiCount(userId, level),
    listening ?? levelListeningProgress(userId, level),
    getDb().then((db) => db.select().from(schema.readingBooks).where(and(eq(schema.readingBooks.userId, userId), eq(schema.readingBooks.level, level))).get()),
  ]);
  const totalSentences = topics.reduce((n, t) => n + t.sentenceCount, 0);
  const saidRight = [...speak.values()].reduce((n, p) => n + p.correct, 0);
  const listen = pct(listeningProgress.watched, listeningProgress.total);
  return {
    // Book sentences said right, plus a little for every Gemini conversation (its pasted report).
    speak: Math.min(100, pct(saidRight, totalSentences) + geminiSpeakBonus(gemini)),
    listen,
    read: Math.min(100, pct(Object.values(read).filter((s) => s >= PASS_AT).length, topics.length * READ_PARTS) + readingProgressBonus(pageBook?.currentPage ?? 0, pageBook?.totalPages ?? null)),
    // A topic is written when its "write about it" reached the goal; the older translate (0) and
    // complete (1) exercises still count half each, so earlier progress isn't lost. AI checks (2) are extra.
    write: pct(numbers.reduce((n, t) => n + writeCredit(write, t), 0), topics.length),
  };
}

export const isLevelTopic = (level: Level, n: number) => n >= TOPIC_RANGE[level][0] && n <= TOPIC_RANGE[level][1];
