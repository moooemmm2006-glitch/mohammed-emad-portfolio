import { describe, expect, it } from "vitest";
import { MAX_PROMPT_URL, withPrompt } from "@/lib/client/clipboard";
import { GEMINI_URL, geminiPrompt } from "../data/gemini-prompts";

// 🎙️ "ابدأ مع Gemini" opens Gemini with the prompt already in the box (the copy stays as backup).
describe("Gemini link with the prompt", () => {
  it("puts the level prompt into ?q= for every level", () => {
    for (const level of ["A1", "A2", "B1", "B2"] as const) {
      const prompt = geminiPrompt(level, { kind: "level" });
      const link = withPrompt(GEMINI_URL, prompt);
      expect(link.startsWith(`${GEMINI_URL}?q=`)).toBe(true);
      expect(decodeURIComponent(new URL(link).searchParams.get("q") ?? "")).toBe(prompt);
      expect(link.length).toBeLessThanOrEqual(MAX_PROMPT_URL);
    }
  });
  it("too long → opens Gemini plainly; other sites untouched", () => {
    expect(withPrompt(GEMINI_URL, "x".repeat(MAX_PROMPT_URL))).toBe(GEMINI_URL);
    expect(withPrompt("https://example.com/", "hi")).toBe("https://example.com/");
  });
});
