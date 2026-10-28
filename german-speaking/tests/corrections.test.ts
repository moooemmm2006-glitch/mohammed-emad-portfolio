import { describe, expect, it } from "vitest";
import type { JsonParams, LLM } from "@/lib/llm";
import { correctAllTurns } from "@/lib/report/corrections";
import { ruleCorrect } from "@/lib/report/ruleCorrections";

describe("rule-based corrections (fallback when the model skips a sentence)", () => {
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
});
