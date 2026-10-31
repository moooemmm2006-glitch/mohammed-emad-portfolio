import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { resetDbForTests } from "@/lib/db";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { getUser, signUp, type UserRow } from "@/lib/auth/users";
import { countWords, JOURNAL_GOAL, journalScore } from "@/lib/journal";
import { levelSkillProgress, saveSkillScore, writeCredit } from "@/lib/skills";

// ✍️ "اكتب عن الموضوع": the learner writes about a topic in their own words; reaching the level's
// word goal completes the topic's writing.

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));
const route = await import("@/app/api/book/journal/route");

describe("writing about a topic", () => {
  it("counts words (numbers and punctuation don't count) and scores against the level's goal", () => {
    expect(countWords("Heute habe ich gelernt, wie man sich vorstellt.")).toBe(8);
    expect(countWords("Ich heiße Sara – ich bin 25 Jahre alt! Grüße aus Köln.")).toBe(10);
    expect(countWords("  ")).toBe(0);
    expect(JOURNAL_GOAL).toEqual({ A1: 40, A2: 60, B1: 80, B2: 100 });
    expect(journalScore(20, "A1")).toBe(50);
    expect(journalScore(40, "A1")).toBe(100);
    expect(journalScore(400, "B2")).toBe(100);
  });

  it("a finished text counts the whole topic; the older exercises still count half each", () => {
    expect(writeCredit({ "1:3": 100 }, 1)).toBe(1);
    expect(writeCredit({ "1:3": 50 }, 1)).toBe(0);
    expect(writeCredit({ "1:0": 90 }, 1)).toBe(0.5);
    expect(writeCredit({ "1:0": 90, "1:1": 85 }, 1)).toBe(1);
    expect(writeCredit({ "1:2": 100 }, 1)).toBe(0); // AI corrections are extra
  });

  describe("API", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-journal-"));
    let n = 0;
    let sara: UserRow;
    let omar: UserRow;
    const as = async (u: UserRow | null) => {
      cookie = u ? await signToken({ u: u.id, v: (await getUser(u.id))!.tokenVersion, e: Date.now() + 60_000 }) : undefined;
    };
    const post = (body: unknown) => route.POST(new Request("http://test/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    const list = (topic: number) => route.GET(new Request(`http://test/x?topic=${topic}`));
    beforeEach(async () => {
      resetDbForTests();
      process.env.DATABASE_PATH = path.join(dir, `j${n++}.db`);
      cookie = undefined;
      sara = await signUp({ name: "Sara", username: "sara", password: "geheim123" });
      omar = await signUp({ name: "Omar", username: "omar", password: "geheim123" });
    });
    afterAll(() => {
      resetDbForTests();
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("needs a login", async () => {
      expect((await post({ topic: 1, text: "Hallo" })).status).toBe(401);
      expect((await list(1)).status).toBe(401);
    });

    it("saves texts per topic, newest first, private to each learner, and completes the topic at the goal", async () => {
      await as(sara);
      const short = await post({ topic: 1, text: "Heute habe ich gelernt, mich vorzustellen." });
      expect(short.status).toBe(201);
      expect(((await short.json()) as { score: number; goal: number }).goal).toBe(40);
      expect((await levelSkillProgress(sara.id, "A1")).write).toBe(0);

      const long = Array.from({ length: 42 }, (_, i) => `Wort${i}`).join(" ");
      const r = (await (await post({ topic: 1, text: long })).json()) as { entry: { words: number }; score: number };
      expect(r.entry.words).toBe(42);
      expect(r.score).toBe(100);
      const p = await levelSkillProgress(sara.id, "A1");
      expect(p.write).toBe(Math.round(100 / 15)); // 1 of 15 A1 topics written

      const mine = (await (await list(1)).json()) as { entries: { words: number }[] };
      expect(mine.entries.map((e) => e.words)).toEqual([42, 6]);

      await as(omar);
      expect(((await (await list(1)).json()) as { entries: unknown[] }).entries).toEqual([]);
    });

    it("refuses empty text, too long text and unknown topics", async () => {
      await as(sara);
      expect((await post({ topic: 1, text: "   " })).status).toBe(400);
      expect((await post({ topic: 1, text: "x".repeat(5001) })).status).toBe(400);
      expect((await post({ topic: 999, text: "Hallo" })).status).toBe(400);
      expect((await list(9999)).status).toBe(404);
    });

    it("keeps progress from the older exercises", async () => {
      await saveSkillScore(sara.id, "write", 1, 0, 85);
      await saveSkillScore(sara.id, "write", 1, 1, 90);
      expect((await levelSkillProgress(sara.id, "A1")).write).toBe(Math.round(100 / 15));
    });
  });
});

describe("Gemini report on my writing", () => {
  it("sends the level, the topic, its words and grammar, my text, and asks for the full report", async () => {
    const { writingReportPrompt } = await import("../data/gemini-prompts");
    const p = writingReportPrompt("A2", { title_de: "Beim Arzt", title_ar: "عند الدكتور", vocab: ["der Arzt", "das Rezept"], grammar: ["Modalverben"] }, "  Ich habe Kopfschmerzen. Ich muss zum Arzt gehen.  ");
    expect(p).toContain("Niveau A2");
    expect(p).toContain('"Beim Arzt" (عند الدكتور)');
    expect(p).toContain("der Arzt, das Rezept");
    expect(p).toContain("Modalverben");
    expect(p).toContain('"""\nIch habe Kopfschmerzen. Ich muss zum Arzt gehen.\n"""');
    for (const part of ["درجة من 10", "اللي عملته صح", "الأخطاء", "النص كله بعد التصحيح", "أذاكر إيه"]) expect(p).toContain(part);
  });
});
