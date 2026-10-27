import { describe, expect, it, vi } from "vitest";
import { heuristicCheck, levelLockedReply, salvageSentences, type CheckResult, type LevelLockDeps } from "@/lib/levelLock";
import { LEVEL_CONFIG, LEVELS } from "@/lib/levels";
import { SentenceBuffer, splitSentences } from "@/lib/text";

const okCheck: CheckResult = { ok: true, violations: [], simplified: null };

function deps(drafts: string[], checks: CheckResult[] = [], simplify = "Gut! Was machst du gern?"): LevelLockDeps & { calls: { generate: (string | null)[] } } {
  const calls = { generate: [] as (string | null)[] };
  let i = 0;
  let c = 0;
  return {
    calls,
    generate: vi.fn(async (feedback: string | null) => {
      calls.generate.push(feedback);
      return drafts[Math.min(i++, drafts.length - 1)];
    }),
    check: vi.fn(async () => checks[Math.min(c++, checks.length - 1)] ?? okCheck),
    simplify: vi.fn(async () => simplify),
  };
}

describe("heuristicCheck", () => {
  it("accepts every level's own allowed examples and safe fallbacks", () => {
    for (const level of LEVELS) {
      for (const s of [...LEVEL_CONFIG[level].allowedExamples, ...LEVEL_CONFIG[level].safeFallbacks]) {
        expect(heuristicCheck(level, s), `${level}: ${s}`).toMatchObject({ ok: true });
      }
    }
  });

  it("rejects the forbidden examples for A1 and A2", () => {
    for (const level of ["A1", "A2"] as const) {
      for (const { sentence } of LEVEL_CONFIG[level].forbiddenExamples) {
        expect(heuristicCheck(level, sentence).ok, `${level}: ${sentence}`).toBe(false);
      }
    }
  });

  it("flags Konjunktiv II, Passiv and relative clauses at A1", () => {
    expect(heuristicCheck("A1", "Ich würde gern Tee trinken.").violations[0].rule).toMatch(/Konjunktiv II/);
    expect(heuristicCheck("A1", "Das Haus wird gebaut.").ok).toBe(false);
    expect(heuristicCheck("A1", "Ich mag den Mann, den ich kenne.").ok).toBe(false);
  });

  it("does not mistake 'Ja, das ist gut' for a relative clause", () => {
    expect(heuristicCheck("A1", "Ja, das ist gut. Und du?").ok).toBe(true);
    expect(heuristicCheck("A1", "Ich trinke Tee, das ist lecker. Und du?").ok).toBe(true);
  });

  it("enforces sentence count and length", () => {
    const tooMany = "Hallo. Ich bin Lena. Ich wohne hier. Wie heißt du?";
    expect(heuristicCheck("A1", tooMany).violations.some((v) => v.rule.startsWith("Too many sentences"))).toBe(true);
    const long = "Ich gehe heute mit meiner Freundin und ihrem kleinen Hund in den Park.";
    expect(heuristicCheck("A1", long).ok).toBe(false);
    expect(heuristicCheck("B1", long).ok).toBe(true);
  });

  it("allows B1 structures at B1 but not at A2", () => {
    const s = "Obwohl ich müde bin, komme ich mit. Kommst du auch?";
    expect(heuristicCheck("A2", s).ok).toBe(false);
    expect(heuristicCheck("B1", s).ok).toBe(true);
  });

  it("flags Konjunktiv I and extended participles at B1 but not at B2", () => {
    const k1 = "Er sagte, er sei zufrieden. Was meinen Sie?";
    expect(heuristicCheck("B1", k1).ok).toBe(false);
    expect(heuristicCheck("B2", k1).ok).toBe(true);
    expect(heuristicCheck("B1", "Die gestern verschickte Ware ist da. Passt das?").ok).toBe(false);
    expect(heuristicCheck("B1", "Das ist ein sehr bekanntes Restaurant. Warst du schon da?").ok).toBe(true);
  });

  it("rejects Arabic script", () => {
    expect(heuristicCheck("A1", "مرحبا! Wie geht's?").ok).toBe(false);
  });
});

describe("levelLockedReply", () => {
  it("returns the first draft when it passes both checks", async () => {
    const d = deps(["Hallo! Wie heißt du?"]);
    const r = await levelLockedReply(d, { level: "A1" });
    expect(r).toMatchObject({ text: "Hallo! Wie heißt du?", attempts: 1, fallback: "none" });
    expect(d.check).toHaveBeenCalledTimes(1);
  });

  it("skips the LLM checker when the heuristic already fails, and feeds violations back", async () => {
    const d = deps(["Wenn du möchtest, könnten wir sprechen. Was meinst du?", "Gut! Was machst du heute?"]);
    const r = await levelLockedReply(d, { level: "A1" });
    expect(r.text).toBe("Gut! Was machst du heute?");
    expect(r.attempts).toBe(2);
    expect(d.check).toHaveBeenCalledTimes(1); // only for the second draft
    expect(d.calls.generate[0]).toBeNull();
    expect(d.calls.generate[1]).toMatch(/broke the A1 rules/);
    expect(d.calls.generate[1]).toMatch(/Konjunktiv II/);
  });

  it("regenerates when the LLM checker finds a violation", async () => {
    const d = deps(
      ["Magst du Musik? Erzähl!", "Was machst du heute?"],
      [{ ok: false, violations: [{ excerpt: "hast du gemacht", rule: "Perfekt" }], simplified: null }, okCheck],
    );
    const onViolation = vi.fn();
    const r = await levelLockedReply(d, { level: "A1", onViolation });
    expect(r.text).toBe("Was machst du heute?");
    expect(onViolation).toHaveBeenCalledWith(0, [{ excerpt: "hast du gemacht", rule: "Perfekt", source: "llm" }]);
  });

  it("gives up after 2 retries and uses the checker's simplified version", async () => {
    const bad = { ok: false, violations: [{ excerpt: "x", rule: "too hard" }], simplified: "Okay! Wie geht es dir?" };
    const d = deps(["Was ist los? Sag mal!"], [bad, bad, bad]);
    const statuses: string[] = [];
    const r = await levelLockedReply(d, { level: "A1", onStatus: (s) => statuses.push(s) });
    expect(d.generate).toHaveBeenCalledTimes(3);
    expect(r.fallback).toBe("checker_simplified");
    expect(r.text).toBe("Okay! Wie geht es dir?");
    expect(r.violations).toHaveLength(3);
    expect(statuses).toEqual(["generating", "checking", "retrying", "checking", "retrying", "checking", "fallback"]);
  });

  it("falls back to the explicit simplify call, then to a canned line", async () => {
    const hard = "Die Arbeitsbedingungen werden ständig verbessert, obwohl niemand das merkt.";
    const d1 = deps([hard], [], "Ich bin Lena. Wie heißt du?");
    expect(await levelLockedReply(d1, { level: "A1" })).toMatchObject({ fallback: "simplified", text: "Ich bin Lena. Wie heißt du?" });

    const d2 = deps([hard], [], hard);
    const r2 = await levelLockedReply(d2, { level: "A1", random: () => 0 });
    expect(r2).toMatchObject({ fallback: "canned", text: LEVEL_CONFIG.A1.safeFallbacks[0] });
  });

  it("treats a failing checker call as a pass when the heuristics passed", async () => {
    const d = deps(["Hallo! Wie geht's?"]);
    d.check = vi.fn(async () => {
      throw new Error("network");
    });
    expect((await levelLockedReply(d, { level: "A1" })).fallback).toBe("none");
  });

  it("salvages passing sentences that still end with a question", () => {
    expect(salvageSentences("A1", "Ich würde gern reisen. Wohin fährst du gern?")).toBe("Wohin fährst du gern?");
    expect(salvageSentences("A1", "Ich würde gern reisen.")).toBeNull();
  });
});

describe("sentence splitting", () => {
  it("splits complete text", () => {
    expect(splitSentences("Hallo! Wie geht's? Gut.")).toEqual(["Hallo!", "Wie geht's?", "Gut."]);
  });
  it("emits streamed sentences only once they are complete", () => {
    const b = new SentenceBuffer();
    expect(b.push("Hallo! Wie ge")).toEqual(["Hallo!"]);
    expect(b.push("ht es dir? Ich")).toEqual(["Wie geht es dir?"]);
    expect(b.flush()).toEqual(["Ich"]);
  });
});
