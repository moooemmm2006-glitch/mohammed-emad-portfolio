import { describe, expect, it, vi } from "vitest";
import {
  heuristicCheck,
  sentenceCheck,
  streamLevelLocked,
  stripArabicHints,
  type CheckResult,
  type StreamLockDeps,
} from "@/lib/levelLock";
import { LEVEL_CONFIG, LEVELS } from "@/lib/levels";
import { SentenceBuffer, splitSentences } from "@/lib/text";

const ok: CheckResult = { ok: true, violations: [], simplified: null };

/** A fake model that streams `text` in small chunks. */
function streaming(text: string, chunk = 7) {
  return async (onText: (d: string) => void, signal: AbortSignal) => {
    for (let i = 0; i < text.length; i += chunk) {
      if (signal.aborted) break;
      onText(text.slice(i, i + chunk));
      await new Promise((r) => setTimeout(r, 1));
    }
    return text;
  };
}

function deps(text: string, over: Partial<StreamLockDeps> = {}): StreamLockDeps {
  return {
    generate: streaming(text),
    check: vi.fn(async () => ok),
    fixSentence: vi.fn(async () => "Was machst du gern?"),
    ...over,
  };
}

describe("heuristic level checks", () => {
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

  it("flags Konjunktiv II, Passiv and relative clauses at A1, but not 'Ja, das ist gut'", () => {
    expect(heuristicCheck("A1", "Ich würde gern Tee trinken.").violations[0].rule).toMatch(/Konjunktiv II/);
    expect(heuristicCheck("A1", "Das Haus wird gebaut.").ok).toBe(false);
    expect(heuristicCheck("A1", "Ich mag den Mann, den ich kenne.").ok).toBe(false);
    expect(heuristicCheck("A1", "Ja, das ist gut. Und du?").ok).toBe(true);
  });

  it("allows longer turns for explanations, stories and opinions", () => {
    const six = "Ich koche gern. Ich esse gern Reis. Ich trinke Tee. Ich mag Obst. Ich kaufe Brot. Was isst du gern?";
    expect(heuristicCheck("A1", six).ok).toBe(false);
    expect(heuristicCheck("A1", six, { intent: "opinion" }).ok).toBe(true);
  });

  it("lets explanations show the structure they explain, but still limits sentence length", () => {
    expect(sentenceCheck("A1", "Ich habe Pizza gegessen.").ok).toBe(false); // Perfekt at A1
    expect(sentenceCheck("A1", "Ich habe Pizza gegessen.", { intent: "explain" }).ok).toBe(true);
    expect(sentenceCheck("A1", "Das Perfekt ist eine Form für die Vergangenheit und man benutzt es sehr oft.", { intent: "explain" }).ok).toBe(false);
  });

  it("allows a bracketed Arabic hint only in A1/A2 explanations, and never reads it aloud", () => {
    const s = "Das zweite Verb steht am Ende (الفعل التاني بيروح آخر الجملة).";
    expect(sentenceCheck("A1", s, { intent: "explain" }).ok).toBe(true);
    expect(sentenceCheck("A1", s).ok).toBe(false);
    expect(sentenceCheck("B1", s, { intent: "explain" }).ok).toBe(false);
    expect(stripArabicHints(s)).toBe("Das zweite Verb steht am Ende.");
  });

  it("rejects a sentence the partner already said (4+ words), but allows short reactions", () => {
    const previous = new Set(["was machst du am wochenende", "super"]);
    expect(sentenceCheck("A1", "Was machst du am Wochenende?", { previous }).ok).toBe(false);
    expect(sentenceCheck("A1", "Super!", { previous }).ok).toBe(true);
  });

  it("flags Konjunktiv I and extended participles at B1 but not at B2", () => {
    const k1 = "Er sagte, er sei zufrieden. Was meinen Sie?";
    expect(heuristicCheck("B1", k1).ok).toBe(false);
    expect(heuristicCheck("B2", k1).ok).toBe(true);
    expect(heuristicCheck("B1", "Die gestern verschickte Ware ist da. Passt das?").ok).toBe(false);
    expect(heuristicCheck("B1", "Das ist ein sehr bekanntes Restaurant. Warst du schon da?").ok).toBe(true);
  });
});

describe("streamLevelLocked (streaming, per-sentence checks)", () => {
  it("emits sentences in order as they pass", async () => {
    const out: string[] = [];
    const r = await streamLevelLocked(deps("Oh, toll! Ich koche auch gern. Was kochst du heute?"), { level: "A1", onSentence: (s) => out.push(s) });
    expect(out).toEqual(["Oh, toll!", "Ich koche auch gern.", "Was kochst du heute?"]);
    expect(r).toMatchObject({ fixed: 0, dropped: 0, fallback: false, text: "Oh, toll! Ich koche auch gern. Was kochst du heute?" });
  });

  it("emits the first sentence before later sentences have been checked (parallel checks)", async () => {
    const events: string[] = [];
    let releaseSecond: () => void = () => {};
    const check = vi.fn(async (s: string) => {
      if (s.startsWith("Ich")) await new Promise<void>((r) => (releaseSecond = r));
      return ok;
    });
    const p = streamLevelLocked(deps("Super! Ich koche gern. Und du?", { check }), {
      level: "A1",
      onSentence: (s) => events.push(`emit:${s}`),
    });
    await vi.waitFor(() => expect(events).toContain("emit:Super!"));
    expect(events).toEqual(["emit:Super!"]); // second sentence still waiting for its check
    releaseSecond();
    await p;
    expect(events).toEqual(["emit:Super!", "emit:Ich koche gern.", "emit:Und du?"]);
  });

  it("regenerates ONLY the sentence that breaks the level", async () => {
    const fixSentence = vi.fn<(s: string) => Promise<string>>(async () => "Ich mag Tee sehr.");
    const out: string[] = [];
    const r = await streamLevelLocked(deps("Super! Ich würde gern Tee trinken. Und du?", { fixSentence }), {
      level: "A1",
      onSentence: (s) => out.push(s),
    });
    expect(out).toEqual(["Super!", "Ich mag Tee sehr.", "Und du?"]);
    expect(fixSentence).toHaveBeenCalledTimes(1);
    expect(fixSentence.mock.calls[0][0]).toBe("Ich würde gern Tee trinken.");
    expect(r.fixed).toBe(1);
  });

  it("uses the LLM checker's simplified sentence when it flags one", async () => {
    const check = vi.fn(async (s: string): Promise<CheckResult> =>
      s.includes("Lieblingsessen") ? { ok: false, violations: [{ excerpt: "Lieblingsessen", rule: "vocabulary" }], simplified: "Was isst du gern?" } : ok,
    );
    const onViolation = vi.fn();
    const out: string[] = [];
    await streamLevelLocked(deps("Toll! Was ist dein Lieblingsessen?", { check }), { level: "A1", onSentence: (s) => out.push(s), onViolation });
    expect(out).toEqual(["Toll!", "Was isst du gern?"]);
    expect(onViolation).toHaveBeenCalledWith(1, [{ excerpt: "Lieblingsessen", rule: "vocabulary", source: "llm" }]);
  });

  it("drops a sentence that can't be fixed and adds a follow-up question if none is left", async () => {
    const out: string[] = [];
    const r = await streamLevelLocked(
      deps("Gut. Die Arbeitsbedingungen werden ständig verbessert, obwohl niemand das merkt.", { fixSentence: async () => "Das wird gemacht, obwohl es spät ist." }),
      { level: "A1", onSentence: (s) => out.push(s), random: () => 0 },
    );
    expect(out).toEqual(["Gut.", "Und du?"]);
    expect(r.dropped).toBe(1);
  });

  it("stops generating once the turn has enough sentences", async () => {
    const out: string[] = [];
    const r = await streamLevelLocked(deps("Ja. Gut. Schön. Toll. Prima. Super. Was machst du?"), { level: "A1", onSentence: (s) => out.push(s) });
    expect(out.slice(0, 3)).toEqual(["Ja.", "Gut.", "Schön."]);
    expect(r.truncated).toBe(true);
  });

  it("does not repeat sentences from earlier turns", async () => {
    const out: string[] = [];
    await streamLevelLocked(deps("Klingt gut. Was würdest du als Nächstes machen?", { fixSentence: async () => "Und was machst du morgen?" }), {
      level: "B1",
      previous: ["Was würdest du als Nächstes machen?"],
      onSentence: (s) => out.push(s),
    });
    expect(out).toEqual(["Klingt gut.", "Und was machst du morgen?"]);
  });

  it("falls back to a level-safe line when nothing usable came back, and rethrows real API errors", async () => {
    const out: string[] = [];
    const r = await streamLevelLocked(deps("", {}), { level: "A2", onSentence: (s) => out.push(s), random: () => 0 });
    expect(r.fallback).toBe(true);
    expect(LEVEL_CONFIG.A2.safeFallbacks).toContain(out[0]);

    await expect(
      streamLevelLocked(deps("x", { generate: async () => Promise.reject(new Error("401 invalid key")) }), { level: "A1", onSentence: () => {} }),
    ).rejects.toThrow("401");
  });

  it("fast mode skips the LLM checker", async () => {
    const check = vi.fn(async () => ok);
    await streamLevelLocked(deps("Hallo! Wie geht's?", { check }), { level: "A1", mode: "fast", onSentence: () => {} });
    expect(check).not.toHaveBeenCalled();
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
