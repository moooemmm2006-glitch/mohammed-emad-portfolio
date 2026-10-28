import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb, schema } from "./db";
import { getWeaknesses, saveWeaknesses } from "./db/repo";
import { serverConfig } from "./config";
import type { BookTopic } from "./book";
import { levelRulesBlock } from "./levelRules";
import type { Level } from "./levels";
import type { LLM } from "./llm";
import { correctAllTurns, type Correction } from "./report/corrections";
import { kindForTag, normalizeTag } from "./report/schema";
import { updateWeaknessTracker, type SessionCounts } from "./report/weakness";
import { splitSentences } from "./text";

// "Schreiben" with an API key: free writing corrected by the AI at the learner's level (Arabic explanations);
// "Lesen" with an API key: a new short reading text about the topic.

export interface WritingCheck {
  id: string;
  topic: number;
  date: string;
  text: string;
  corrections: Correction[];
  counts: SessionCounts["counts"];
}

export async function checkFreeWriting(userId: string, topic: BookTopic, text: string, llm: LLM, now = Date.now()): Promise<WritingCheck> {
  const sentences = splitSentences(text.trim()).slice(0, 30);
  const { corrections } = await correctAllTurns(
    sentences.map((s, i) => ({ turn: i + 1, text: s })),
    { llm, model: serverConfig().correctionModel, level: topic.level, language: "ar", written: true },
  );
  const byTag = new Map<string, number>();
  for (const c of corrections) for (const f of c.fixes) byTag.set(normalizeTag(f.tag), (byTag.get(normalizeTag(f.tag)) ?? 0) + 1);
  const counts = [...byTag.entries()].map(([tag, count]) => ({ tag, kind: kindForTag(tag), count }));
  const check: WritingCheck = { id: `w-${randomUUID()}`, topic: topic.number, date: new Date(now).toISOString(), text, corrections, counts };

  const db = await getDb();
  await db.insert(schema.writingChecks).values({ id: check.id, userId, topic: topic.number, createdAt: now, json: JSON.stringify(check) }).run();
  // Mistakes go into the weakness tracker like a spoken report.
  if (counts.length) await saveWeaknesses(updateWeaknessTracker(await getWeaknesses(userId), { sessionId: check.id, date: check.date, counts }), userId);
  return check;
}

/** Writing checks as tracker entries, oldest first (so a regenerated report doesn't drop them). */
export async function writingTimeline(userId: string): Promise<SessionCounts[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.writingChecks).where(eq(schema.writingChecks.userId, userId)).orderBy(desc(schema.writingChecks.createdAt)).all();
  return rows
    .map((r) => JSON.parse(r.json) as WritingCheck)
    .map((w) => ({ sessionId: w.id, date: w.date, counts: w.counts }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** A new short reading text about the topic, at the level, with the topic's words. */
export async function newReadingText(topic: BookTopic, llm: LLM): Promise<string> {
  const level = topic.level as Level;
  const system = `You write short German reading texts for an Arabic-speaking learner at CEFR level ${level}.
${levelRulesBlock(level)}
Write ONE text of ${level === "A1" ? "6–8" : level === "A2" ? "8–10" : "10–14"} short sentences (a small story, dialogue or message) about the topic.
Use many of the given words and the given grammar, stay strictly at the level, no title, no translation, plain German text only.`;
  const prompt = `Topic: ${topic.title_de} (${topic.title_ar})
Words: ${topic.vocab.map((v) => v.de).join(", ")}
Grammar: ${topic.grammar.map((g) => `${g.title_de}: ${g.formula}`).join(" | ")}`;
  const text = await llm.chat({ model: serverConfig().textModel, system, messages: [{ role: "user", content: prompt }], maxTokens: 700, purpose: "reading", level });
  return text.trim();
}
