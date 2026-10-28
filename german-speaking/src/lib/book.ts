import { z } from "zod";
import type { Level } from "./levels";
import { levelOfTopic, TOPIC_RANGE } from "./bookLevels";

export { levelOfTopic, TOPIC_RANGE };

// The learner's own book "Sprich Deutsch" (A1 → B2): 100 topics, 10,000 sentences, 546 grammar points.
// Server only. Each level file is loaded lazily (its own chunk), validated once and cached.

const Pair = z.object({ de: z.string().min(1), ar: z.string() });

export const SentenceSchema = z.object({ n: z.number().int().positive(), de: z.string().min(1), ar: z.string() });
export const GrammarSchema = z.object({
  title_de: z.string(),
  title_ar: z.string(),
  formula: z.string(),
  explanation_ar: z.string(),
  examples: z.array(Pair),
});
export const TopicSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2"]),
  number: z.number().int().min(1).max(100),
  title_de: z.string(),
  title_ar: z.string(),
  intro_ar: z.string(),
  vocab: z.array(Pair),
  sections: z.array(z.object({ number: z.number().int(), title_de: z.string(), title_ar: z.string(), sentences: z.array(SentenceSchema).min(1) })).min(1),
  grammar: z.array(GrammarSchema),
});
const LevelFileSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2"]),
  topic_count: z.number(),
  sentence_count: z.number(),
  grammar_count: z.number(),
  topics: z.array(TopicSchema),
});

export type BookSentence = z.infer<typeof SentenceSchema>;
export type BookGrammar = z.infer<typeof GrammarSchema>;
export type BookTopic = z.infer<typeof TopicSchema>;

// Dynamic imports keep each level in its own server chunk (bundled, so it works on Vercel without file tracing).
const LOADERS: Record<Level, () => Promise<unknown>> = {
  A1: () => import("../../data/book/a1.json").then((m) => m.default as unknown),
  A2: () => import("../../data/book/a2.json").then((m) => m.default as unknown),
  B1: () => import("../../data/book/b1.json").then((m) => m.default as unknown),
  B2: () => import("../../data/book/b2.json").then((m) => m.default as unknown),
};

const cache = new Map<Level, Promise<BookTopic[]>>();

async function loadLevel(level: Level): Promise<BookTopic[]> {
  const raw = await LOADERS[level]();
  const file = LevelFileSchema.parse(raw);
  const [a, b] = TOPIC_RANGE[level];
  const sentences = file.topics.reduce((n, t) => n + t.sections.reduce((m, s) => m + s.sentences.length, 0), 0);
  const grammar = file.topics.reduce((n, t) => n + t.grammar.length, 0);
  if (file.level !== level || file.topics.length !== b - a + 1 || file.topics.some((t) => t.level !== level || t.number < a || t.number > b)) {
    throw new Error(`Book file for ${level} has unexpected topics`);
  }
  if (sentences !== file.sentence_count || grammar !== file.grammar_count) throw new Error(`Book file for ${level}: counts don't match`);
  return file.topics.sort((x, y) => x.number - y.number);
}

/** All topics of a level, in book order. */
export function getTopics(level: Level): Promise<BookTopic[]> {
  let p = cache.get(level);
  if (!p) {
    p = loadLevel(level);
    p.catch(() => cache.delete(level));
    cache.set(level, p);
  }
  return p;
}

/** One topic by its book number; the level must match (B2 topics belong to B2, etc.). */
export async function getTopic(level: Level, number: number): Promise<BookTopic | null> {
  if (levelOfTopic(number) !== level) return null;
  return (await getTopics(level)).find((t) => t.number === number) ?? null;
}

export async function getTopicByNumber(number: number): Promise<BookTopic | null> {
  const level = levelOfTopic(number);
  return level ? getTopic(level, number) : null;
}

/** Sentences of a topic, or of one section (1-based section number). */
export function getSentences(topic: BookTopic, section?: number): BookSentence[] {
  const secs = section ? topic.sections.filter((s) => s.number === section) : topic.sections;
  return secs.flatMap((s) => s.sentences);
}

export interface TopicSummary {
  level: Level;
  number: number;
  title_de: string;
  title_ar: string;
  intro_ar: string;
  sentenceCount: number;
  sections: { number: number; title_de: string; title_ar: string }[];
}

/** Light topic list for the level page (no sentences). */
export async function topicSummaries(level: Level): Promise<TopicSummary[]> {
  return (await getTopics(level)).map((t) => ({
    level: t.level,
    number: t.number,
    title_de: t.title_de,
    title_ar: t.title_ar,
    intro_ar: t.intro_ar,
    sentenceCount: getSentences(t).length,
    sections: t.sections.map(({ number, title_de, title_ar }) => ({ number, title_de, title_ar })),
  }));
}

/** Look up sentences by their global book number (1–10000), e.g. for the review list. */
export async function sentencesByNumber(ns: number[]): Promise<Map<number, BookSentence & { topic: number; level: Level }>> {
  const out = new Map<number, BookSentence & { topic: number; level: Level }>();
  const want = new Set(ns);
  if (!want.size) return out;
  for (const level of Object.keys(TOPIC_RANGE) as Level[]) {
    for (const t of await getTopics(level)) {
      for (const s of getSentences(t)) if (want.has(s.n)) out.set(s.n, { ...s, topic: t.number, level });
    }
  }
  return out;
}

const STOP = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "und", "ich", "du", "sie", "wir", "ihr", "es", "er", "ist", "bin", "bist", "sind", "nicht", "mit", "auf", "in", "im", "zu", "zum", "zur", "von", "für", "auch", "noch", "sehr", "ja", "nein"]);
const tok = (t: string) =>
  t
    .toLowerCase()
    .split(/[^a-zäöüß]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

/** The topic's grammar point that best fits a sentence (shared words with its title, formula and examples). */
export function relatedGrammar(topic: BookTopic, sentence: string): BookGrammar | null {
  const words = new Set(tok(sentence));
  let best: { g: BookGrammar; score: number } | null = null;
  for (const g of topic.grammar) {
    const pool = new Set(tok([g.title_de, g.formula, ...g.examples.map((e) => e.de)].join(" ")));
    let score = 0;
    for (const w of words) if (pool.has(w)) score++;
    if (g.examples.some((e) => e.de.trim() === sentence.trim())) score += 3;
    if (!best || score > best.score) best = { g, score };
  }
  return best && best.score > 0 ? best.g : null;
}
