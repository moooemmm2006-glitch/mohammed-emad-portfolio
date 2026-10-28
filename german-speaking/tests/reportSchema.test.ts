import { describe, expect, it } from "vitest";
import { z } from "zod";
import { withJsonRetries } from "@/lib/llm/json";
import { LLMReportSchema, normalizeTag, type LLMReport } from "@/lib/report/schema";
import { extractJson } from "@/lib/text";

export function sampleReport(over: Partial<LLMReport> = {}): LLMReport {
  return {
    sinceLastTime: { summary: "s", improved: [], regressed: [], newIssues: [], unresolved: [], lastFiveTrend: "t" },
    overallImpression: "gut",
    scores: { grammar: 70, vocabulary: 60, fluency: 55, pronunciation: 65, complexity: 50, confidence: 80 },
    scoreNotes: { grammar: "", vocabulary: "", fluency: "", pronunciation: "", complexity: "", confidence: "" },
    strengths: [{ point: "p", example: "Ich arbeite als Ingenieur." }],
    mistakes: [{ said: "Ich kann gehen morgen.", corrected: "Ich kann morgen gehen.", explanation: "e", tag: "Modalverben", severity: "high" }],
    pronunciation: { disclaimer: "indicative", notes: [{ word: "ich", tag: "pron_ch_sch", issue: "i", tip: "t", indicator: "low_confidence" }] },
    vocabulary: { goodWords: [], struggledWith: [], learnNext: [] },
    homework: [{ title: "a", description: "b" }],
    levelRecommendation: { verdict: "stay", reasoning: "r" },
    correctedSentences: [],
    weaknessCounts: [],
    nextFocus: "Modalverben",
    ...over,
  };
}

describe("report schema", () => {
  it("accepts a complete report", () => {
    expect(LLMReportSchema.safeParse(sampleReport()).success).toBe(true);
  });

  it("rejects missing sections and wrong enums", () => {
    const { homework: _h, ...noHomework } = sampleReport();
    void _h;
    expect(LLMReportSchema.safeParse(noHomework).success).toBe(false);
    const badVerdict = sampleReport({ levelRecommendation: { verdict: "sideways" as "stay", reasoning: "" } });
    expect(LLMReportSchema.safeParse(badVerdict).success).toBe(false);
  });

  it("normalises German tag spellings", () => {
    expect(normalizeTag("Präpositionen")).toBe("praepositionen");
    expect(normalizeTag("Trennbare Verben")).toBe("trennbare_verben");
    expect(normalizeTag("!!!")).toBe("sonstiges");
  });

});

describe("JSON retry wrapper", () => {
  const S = z.object({ a: z.number() });

  it("extracts JSON from fenced or chatty output", () => {
    expect(extractJson('Sure!\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here: {"a": {"b": "}"}} done')).toEqual({ a: { b: "}" } });
  });

  it("retries with feedback until the output matches the schema", async () => {
    const outputs = ["not json at all", '{"a": "one"}', '{"a": 1}'];
    const feedback: (string | undefined)[] = [];
    const v = await withJsonRetries((fb) => {
      feedback.push(fb);
      return Promise.resolve(outputs.shift());
    }, S);
    expect(v).toEqual({ a: 1 });
    expect(feedback[0]).toBeUndefined();
    expect(feedback[1]).toMatch(/not valid JSON/);
    expect(feedback[2]).toMatch(/did not match the schema/);
  });

  it("gives up after the attempt limit", async () => {
    await expect(withJsonRetries(() => Promise.resolve("{}"), S, 2)).rejects.toThrow(/after 2 attempts/);
  });

  it("does not retry refusals", async () => {
    let n = 0;
    const err = Object.assign(new Error("no"), { name: "LLMRefusalError" });
    await expect(
      withJsonRetries(() => {
        n++;
        return Promise.reject(err);
      }, S),
    ).rejects.toThrow("no");
    expect(n).toBe(1);
  });
});
