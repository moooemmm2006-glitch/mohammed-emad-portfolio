import { describe, expect, it } from "vitest";
import { isLearnerSpeech, joinSegments, TurnTranscript, type Segment } from "@/lib/client/transcript";

const seg = (text: string, isFinal = true, confidence: number | null = 0.9): Segment => ({ text, isFinal, confidence, alternatives: [] });

describe("turn transcript (pauses and recogniser restarts)", () => {
  it("keeps one turn across several recogniser sessions (the browser stopping during a pause)", () => {
    const t = new TurnTranscript();
    t.update([seg("Ich habe", false, null)]);
    expect(t.text()).toBe("Ich habe");
    t.update([seg("Ich habe gestern")]);
    t.commitSession(); // browser ended recognition during a pause → restarted
    t.update([seg("äh", false, null)]);
    t.update([seg("einen Kuchen gebacken")]);
    t.commitSession();
    expect(t.result()).toEqual({ text: "Ich habe gestern einen Kuchen gebacken", confidence: 0.9, alternatives: [] });
  });

  it("keeps unfinished (interim) words when the recogniser stops mid-phrase", () => {
    const t = new TurnTranscript();
    t.update([seg("Ich arbeite"), seg(" als Ingenieur", false, null)]);
    t.commitSession();
    expect(t.result()?.text).toBe("Ich arbeite als Ingenieur");
  });

  it("de-duplicates Android-style cumulative segments", () => {
    expect(joinSegments(["ich", "ich habe", "ich habe Zeit"])).toBe("ich habe Zeit");
    expect(joinSegments(["Hallo", "wie geht's"])).toBe("Hallo wie geht's");
  });

  it("starts from barge-in words and returns null for an empty turn", () => {
    expect(new TurnTranscript().result()).toBeNull();
    expect(new TurnTranscript("   ").hasSpeech).toBe(false);
    const t = new TurnTranscript("Moment mal");
    t.update([seg("ich habe eine Frage")]);
    expect(t.text()).toBe("Moment mal ich habe eine Frage");
  });

  it("averages confidence over final segments only", () => {
    const t = new TurnTranscript();
    t.update([seg("Hallo", true, 0.8), seg("Lena", true, 0.6)]);
    expect(t.result()?.confidence).toBeCloseTo(0.7);
  });
});

describe("barge-in echo filter", () => {
  const partner = "Ich wohne in Hamburg. Was machst du gern am Abend?";
  it("ignores the partner's own voice coming back through the speakers", () => {
    expect(isLearnerSpeech("was machst du gern", partner)).toBe(false);
    expect(isLearnerSpeech("Hamburg", partner)).toBe(false);
  });
  it("accepts the learner starting to talk", () => {
    expect(isLearnerSpeech("ich spiele Fußball mit Freunden", partner)).toBe(true);
  });
});
