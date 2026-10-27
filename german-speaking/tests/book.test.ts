import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getSentences, getTopic, getTopicByNumber, getTopics, levelOfTopic, relatedGrammar, topicSummaries } from "@/lib/book";
import { compareSentence, numberWord } from "@/lib/bookCompare";
import { judgeAnswer, nextItem, scriptFor } from "@/lib/bookScript";
import { dueReview, recordAttempts, sentenceScores, topicProgress } from "@/lib/bookProgress";
import { runPartnerTurn, type TurnEvent } from "@/lib/conversation";
import { resetDbForTests } from "@/lib/db";
import { createSession, getTurns, parseMeta } from "@/lib/db/repo";
import { LEVELS } from "@/lib/levels";
import { MockLLM } from "@/lib/llm/mock";
import { generateReport } from "@/lib/report/generate";
import { buildPartnerSystemPrompt } from "@/lib/prompts";

describe("book loader", () => {
  it("loads all 100 topics, 10,000 sentences and 546 grammar points, split by level", async () => {
    const counts = { topics: 0, sentences: 0, grammar: 0 };
    const perLevel: Record<string, number> = {};
    for (const level of LEVELS) {
      const topics = await getTopics(level);
      perLevel[level] = topics.length;
      for (const t of topics) {
        expect(t.level).toBe(level);
        expect(levelOfTopic(t.number)).toBe(level);
        expect(t.sections).toHaveLength(5);
        counts.topics++;
        counts.sentences += getSentences(t).length;
        counts.grammar += t.grammar.length;
      }
    }
    expect(counts).toEqual({ topics: 100, sentences: 10000, grammar: 546 });
    expect(perLevel).toEqual({ A1: 15, A2: 25, B1: 30, B2: 30 });
  });

  it("finds topics only in their own level, and sentences per section", async () => {
    expect((await getTopic("A1", 1))?.title_de).toBe("Begrüßung und Vorstellung");
    expect(await getTopic("A1", 16)).toBeNull(); // topic 16 is A2
    expect((await getTopic("A2", 16))?.level).toBe("A2");
    expect((await getTopicByNumber(100))?.level).toBe("B2");
    const t1 = (await getTopicByNumber(1))!;
    expect(getSentences(t1)).toHaveLength(100);
    expect(getSentences(t1, 1).map((s) => s.n)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    const summaries = await topicSummaries("B1");
    expect(summaries.map((x) => x.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 41));
    expect(JSON.stringify(summaries)).not.toContain('"sentences"'); // the list page gets no sentences
  });

  it("links a sentence to the topic's grammar point", async () => {
    const t1 = (await getTopicByNumber(1))!;
    expect(relatedGrammar(t1, "Ich wohne in Berlin.")?.title_de).toContain("Präsens");
  });
});

describe("sentence comparison", () => {
  it("accepts the same sentence regardless of case, punctuation and ß/ss", () => {
    expect(compareSentence("Ich heiße Ahmed.", "ich heisse ahmed").score).toBe(100);
    expect(compareSentence("Guten Morgen, Frau Schmidt!", "Guten Morgen Frau Schmidt").status).toBe("correct");
  });

  it("matches digits and number words, and tolerates one wrong letter in long words", () => {
    expect(numberWord(7)).toBe("sieben");
    expect(numberWord(25)).toBe("fünfundzwanzig");
    expect(compareSentence("Ich bin 29 Jahre alt.", "ich bin neunundzwanzig Jahre alt").score).toBe(100);
    expect(compareSentence("Ich habe Informatik studiert.", "ich habe Informatik studierd").score).toBe(100);
  });

  it("marks missed words and scores partial and wrong answers", () => {
    const c = compareSentence("Ich komme aus Ägypten und wohne in Kairo.", "ich komme aus Ägypten");
    expect(c.status).toBe("partial");
    expect(c.missed).toEqual(["und", "wohne", "in", "Kairo."]);
    expect(c.words.find((w) => w.text === "Kairo.")?.ok).toBe(false);
    expect(compareSentence("Wie geht es Ihnen?", "Danke gut").status).toBe("wrong");
    expect(compareSentence("Ich wohne in Berlin.", "").score).toBe(0);
  });

  it("word order matters", () => {
    // Modal verb sentence with the infinitive in the wrong place loses a word.
    expect(compareSentence("Ich kann Deutsch sprechen.", "ich kann sprechen Deutsch").score).toBeLessThan(100);
  });
});

describe("guided conversation from the book (no API key)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-book-"));
  let n = 0;
  beforeEach(() => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `b${n++}.db`);
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("builds a question → answer script in book order without repeats", async () => {
    const topic = (await getTopicByNumber(44))!;
    const items = scriptFor(topic);
    expect(items.length).toBeGreaterThan(15);
    expect(new Set(items.map((i) => i.n)).size).toBe(items.length);
    expect(items.map((i) => i.section)).toEqual([...items.map((i) => i.section)].sort((a, b) => a - b));
    for (const it of items.filter((x) => x.kind === "question")) {
      expect(it.ask.endsWith("?")).toBe(true);
      expect(it.answers.length).toBeGreaterThan(0);
    }
    expect(nextItem(items, items.at(-1)!.n)).toBeUndefined();
    const q = items.find((x) => x.ask === "Wie haben Sie Deutsch gelernt?")!;
    expect(judgeAnswer("Ich habe Kurse besucht und spreche viel mit Kollegen", q).status).toBe("correct");
    expect(judgeAnswer("Ich habe Kurse besucht", q).status).toBe("partial");
  });

  const run = async (sessionId: string, text?: string) => {
    const ev: TurnEvent[] = [];
    await runPartnerTurn({ sessionId, userText: text, emit: (e) => ev.push(e), llm: new MockLLM() });
    const done = ev.find((e) => e.type === "done");
    return done && done.type === "done" ? done.text : "";
  };

  it("asks the book's questions, reacts, corrects with the book sentence, and reports it", async () => {
    const s = await createSession("B1", null, null, "u1", 44);
    const topic = (await getTopicByNumber(44))!;
    const items = scriptFor(topic);

    const hello = await run(s.id);
    expect(hello).toContain(topic.title_de);
    expect(hello).toContain(items[0].ask);

    // A correct book answer → praise + the next question.
    const r1 = await run(s.id, items[0].answers[0].de);
    expect(r1).toMatch(/Super|Genau|Sehr gut|Richtig|Prima|Toll/);
    expect(r1).toContain(items[1].ask);

    // A half answer → gentle correction with the book sentence and its Arabic meaning.
    const target = items[1].answers[0];
    const half = target.de.split(" ").slice(0, Math.ceil(target.de.split(" ").length * 0.6)).join(" ");
    const r2 = await run(s.id, half);
    expect(r2).toContain(target.de);
    expect(r2).toContain("ممكن تقولها كده");
    expect(r2).toContain(items[2].ask);

    const asked = (await getTurns(s.id)).filter((t) => t.role === "partner").map((t) => parseMeta(t).bookQ);
    expect(asked).toEqual([items[0].n, items[1].n, items[2].n]);

    // Report: the half sentence is listed with the book version; progress is saved.
    await run(s.id, "Ich heiße Mohammed.");
    // Answering after the last question never starts the topic again.
    expect(new Set(asked).size).toBe(asked.length);
    const report = await generateReport(s.id, { llm: new MockLLM() });
    expect(report.book?.topic).toBe(44);
    expect(report.book?.items.some((x) => x.de === target.de && x.ar === target.ar)).toBe(true);
    expect(report.book!.correct).toBeGreaterThanOrEqual(1);
    const scores = await sentenceScores("u1", 44);
    expect(scores[items[0].answers[0].n]).toBe(100);
  });

  it("goes through the whole topic once and then closes", async () => {
    const s = await createSession("A1", null, null, "u1", 3);
    const items = scriptFor((await getTopicByNumber(3))!);
    await run(s.id);
    let last = "";
    for (const it of items) last = await run(s.id, it.answers[0].de);
    expect(last).toContain("Das war's");
    expect(await run(s.id, "Noch etwas?")).toContain("Das war's");
    const asked = (await getTurns(s.id)).filter((t) => t.role === "partner").map((t) => parseMeta(t).bookQ).filter((q) => q);
    expect(asked).toEqual(items.map((i) => i.n));
  });

  it("keeps the AI partner inside the topic", async () => {
    const topic = (await getTopicByNumber(72))!;
    const prompt = buildPartnerSystemPrompt({ level: "B2", correctionMode: "recast", bookTopic: topic });
    expect(prompt).toContain(topic.title_de);
    expect(prompt).toContain("keep the whole conversation inside this topic");
    expect(prompt).toContain(topic.grammar[0].formula);
    const sampleLines = prompt.split("\n").filter((l) => getSentences(topic).some((x) => l === `- ${x.de}`));
    expect(sampleLines.length).toBeGreaterThanOrEqual(25);
    expect(sampleLines.length).toBeLessThanOrEqual(35);
  });
});

describe("book progress and spaced review", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-bookp-"));
  let n = 0;
  beforeEach(() => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `p${n++}.db`);
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("finishes a topic at 80% correct sentences, per user", async () => {
    const totals = new Map([[1, 100]]);
    await recordAttempts("a", Array.from({ length: 79 }, (_, i) => ({ n: i + 1, topic: 1, score: 100 })));
    expect((await topicProgress("a", totals)).get(1)).toMatchObject({ correct: 79, done: false });
    await recordAttempts("a", [{ n: 80, topic: 1, score: 90 }]);
    expect((await topicProgress("a", totals)).get(1)).toMatchObject({ correct: 80, done: true });
    expect((await topicProgress("b", totals)).get(1)).toBeUndefined();
  });

  it("brings wrong sentences back after 1 day, then 3 days, then a week", async () => {
    const day = 86_400_000;
    const t0 = Date.UTC(2026, 0, 10, 18);
    await recordAttempts("a", [{ n: 5, topic: 1, score: 40 }], t0);
    expect(await dueReview("a", t0)).toHaveLength(0);
    expect(await dueReview("a", t0 + day)).toHaveLength(1);
    await recordAttempts("a", [{ n: 5, topic: 1, score: 100 }], t0 + day); // review 1 ok → in 3 days
    expect(await dueReview("a", t0 + 2 * day)).toHaveLength(0);
    expect(await dueReview("a", t0 + 4 * day)).toHaveLength(1);
    await recordAttempts("a", [{ n: 5, topic: 1, score: 100 }], t0 + 4 * day); // → in a week
    expect(await dueReview("a", t0 + 11 * day)).toHaveLength(1);
    await recordAttempts("a", [{ n: 5, topic: 1, score: 100 }], t0 + 11 * day); // learned
    expect(await dueReview("a", t0 + 60 * day)).toHaveLength(0);
    // Wrong again during review → back to one day.
    await recordAttempts("a", [{ n: 6, topic: 1, score: 30 }], t0);
    await recordAttempts("a", [{ n: 6, topic: 1, score: 30 }], t0 + day);
    expect(await dueReview("a", t0 + 2 * day)).toHaveLength(1);
    expect(await dueReview("b", t0 + 2 * day)).toHaveLength(0);
  });
});
