import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { runPartnerTurn } from "@/lib/conversation";
import { resetDbForTests } from "@/lib/db";
import { createSession } from "@/lib/db/repo";
import type { JsonParams, LLM } from "@/lib/llm";
import { MockLLM } from "@/lib/llm/mock";
import { correctAllTurns, isFillerOnly, learnerTurnsToCorrect, mistakesFromCorrections, quotesWrongSentence, type Correction } from "@/lib/report/corrections";
import { generateReport } from "@/lib/report/generate";
import { ruleCorrect } from "@/lib/report/ruleCorrections";

describe("rule-based corrections (demo mode)", () => {
  it("fixes repeated words and the dative after 'mit'", () => {
    const r = ruleCorrect("ich habe viele Probleme mit mit meine Lieben");
    expect(r.corrected).toBe("ich habe viele Probleme mit meinen Lieben");
    expect(r.fixes.map((f) => f.tag)).toEqual(["doppeltes_wort", "dativ_akkusativ"]);
  });

  it("moves the infinitive to the end after a modal verb", () => {
    expect(ruleCorrect("ich möchte mit dir sprechen über meine Liebe").corrected).toBe("ich möchte mit dir über meine Liebe sprechen");
    expect(ruleCorrect("Ich kann sprechen Deutsch").corrected).toBe("Ich kann Deutsch sprechen");
    expect(ruleCorrect("Ich kann gut kochen").fixes).toEqual([]);
    expect(ruleCorrect("Ich möchte einen Kaffee trinken").fixes).toEqual([]);
  });

  it("knows frequent Arabic-speaker mistakes", () => {
    expect(ruleCorrect("Sehr Hilfe mir").corrected).toBe("Das hilft mir sehr");
    expect(ruleCorrect("ich habe ein ich habe 25 Jahre").corrected).toBe("ich bin 25 Jahre alt");
    expect(ruleCorrect("Ich habe nach Berlin gegangen").corrected).toBe("Ich bin nach Berlin gegangen");
    expect(ruleCorrect("weil ich bin müde").corrected).toBe("weil ich müde bin");
    expect(ruleCorrect("Ich wohne in Kairo.").fixes).toEqual([]);
  });

  it("ignores pure fillers", () => {
    expect(isFillerOnly("Mhm")).toBe(true);
    expect(isFillerOnly("äh ähm")).toBe(true);
    expect(isFillerOnly("Ja, gut")).toBe(false);
    const turns = learnerTurnsToCorrect([
      { role: "learner", text: "Hallo" },
      { role: "partner", text: "Hi" },
      { role: "learner", text: "Mhm" },
      { role: "learner", text: "Ich bin Ali" },
    ]);
    expect(turns).toEqual([
      { turn: 1, text: "Hallo" },
      { turn: 2, text: "Ich bin Ali" },
    ]);
  });
});

// A fake "real" model that skips a turn the first time, to check re-requests.
class SkippingLLM implements LLM {
  provider = "anthropic" as const;
  prompts: string[] = [];
  async chat() {
    return "";
  }
  async json<T>(p: JsonParams<T>): Promise<T> {
    this.prompts.push(p.prompt);
    const turns = JSON.parse(p.prompt.slice(p.prompt.indexOf("["))) as { turn: number; text: string }[];
    const keep = this.prompts.length === 1 ? turns.filter((t) => t.turn !== 2) : turns;
    return p.schema.parse({
      corrections: keep.map((t) => ({ turn: t.turn, original: t.text, corrected: t.text + "!", isCorrect: false, natural: null, fixes: [{ wrong: "x", right: "y", explanation: "e", tag: "wortstellung", severity: "medium" }] })),
    });
  }
}

describe("AI corrections (mocked model)", () => {
  it("corrects every turn and re-requests turns the model skipped", async () => {
    const llm = new SkippingLLM();
    const turns = [1, 2, 3].map((n) => ({ turn: n, text: `Satz ${n}` }));
    const { corrections, mode } = await correctAllTurns(turns, { llm, model: "m", level: "A2", language: "ar" });
    expect(mode).toBe("ai");
    expect(corrections.map((c) => c.turn)).toEqual([1, 2, 3]);
    expect(llm.prompts).toHaveLength(2);
    expect(llm.prompts[1]).toContain('"turn":2');
    expect(llm.prompts[1]).not.toContain('"turn":1');
  });

  it("analyses long conversations in batches so nothing is skipped", async () => {
    const llm = new SkippingLLM();
    llm.prompts.push("warm-up"); // make the fake answer every turn
    const turns = Array.from({ length: 23 }, (_, i) => ({ turn: i + 1, text: `Satz ${i + 1}` }));
    const { corrections } = await correctAllTurns(turns, { llm, model: "m", level: "B1", language: "ar" });
    expect(corrections).toHaveLength(23);
    expect(llm.prompts.length - 1).toBe(3); // 10 + 10 + 3
  });

  it("detects praise that quotes a wrong sentence", () => {
    const c: Correction[] = [{ turn: 1, original: "Sehr Hilfe mir", corrected: "Das hilft mir sehr", isCorrect: false, natural: null, fixes: [{ wrong: "Sehr Hilfe mir", right: "Das hilft mir sehr", explanation: "", tag: "wortschatz", severity: "medium" }] }];
    expect(quotesWrongSentence("Sehr Hilfe mir", c)).toBe(true);
    expect(quotesWrongSentence("Ich wohne in Kairo", c)).toBe(false);
    expect(mistakesFromCorrections(c)).toHaveLength(1);
  });
});

describe("report with corrections (demo mode, end to end)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-corr-"));
  let n = 0;
  beforeEach(() => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `t${n++}.db`);
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("lists every sentence with its correction, all mistakes, and never praises a wrong sentence", async () => {
    const llm = new MockLLM();
    const s = await createSession("A2", null, null, "u1");
    const said = ["ich habe viele Probleme mit mit meine Lieben", "Sehr Hilfe mir", "ich möchte mit dir sprechen über meine Liebe", "Mhm", "Ich wohne in Kairo."];
    for (const t of [undefined, ...said]) await runPartnerTurn({ sessionId: s.id, userText: t, emit: () => {}, llm });
    const r = await generateReport(s.id, { llm });

    expect(r.correctionsMode).toBe("rules");
    expect(r.corrections?.map((c) => c.original)).toEqual(said.filter((x) => x !== "Mhm"));
    expect(r.corrections?.filter((c) => c.isCorrect).map((c) => c.original)).toEqual(["Ich wohne in Kairo."]);
    expect(r.mistakes.length).toBe(4);
    expect(new Set(r.mistakes.map((m) => m.tag))).toEqual(new Set(["doppeltes_wort", "dativ_akkusativ", "wortschatz", "modalverben"]));
    for (const st of r.strengths) expect(quotesWrongSentence(st.example, r.corrections!), st.example).toBe(false);
    // the categories feed the weakness tracker
    expect(r.weaknessCounts.map((w) => w.tag)).toEqual(expect.arrayContaining(["dativ_akkusativ", "modalverben"]));
  });
});
