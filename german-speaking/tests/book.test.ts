import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getSentences, getTopic, getTopicByNumber, getTopics, levelOfTopic, relatedGrammar, topicSummaries } from "@/lib/book";
import { compareSentence, numberWord } from "@/lib/bookCompare";
import { dueReview, recordAttempts, topicProgress } from "@/lib/bookProgress";
import { resetDbForTests } from "@/lib/db";
import { LEVELS } from "@/lib/levels";

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
