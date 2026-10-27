import { describe, expect, it } from "vitest";
import { detectIntent } from "@/lib/intent";
import { LEVEL_KNOWLEDGE } from "@/lib/levelKnowledge";
import { heuristicCheck } from "@/lib/levelLock";
import { LEVEL_CONFIG, LEVELS } from "@/lib/levels";
import type { ChatMessage } from "@/lib/llm";
import { CHAT_POOL, EXPLANATIONS, mockPartnerReply, TOPIC_REPLIES } from "@/lib/llm/mock";
import { buildPartnerSystemPrompt, turnInstruction } from "@/lib/prompts";
import { START_SIGNAL } from "@/lib/prompts";

describe("intent detection", () => {
  it("recognises grammar and vocabulary questions", () => {
    expect(detectIntent("Können Sie Modalverben erklären?")).toEqual({ intent: "explain", topic: "modalverben" });
    expect(detectIntent("Was ist das Perfekt?")).toEqual({ intent: "explain", topic: "perfekt" });
    expect(detectIntent("Wann benutze ich Dativ?")).toEqual({ intent: "explain", topic: "kasus" });
    expect(detectIntent("Kannst du trennbare Verben erklären")).toEqual({ intent: "explain", topic: "trennbar" });
    expect(detectIntent("Was bedeutet Feierabend?").intent).toBe("explain");
  });
  it("recognises opinions and stories, and leaves normal chat alone", () => {
    expect(detectIntent("Was hältst du von Homeoffice?").intent).toBe("opinion");
    expect(detectIntent("Erzähl mal von deinem Urlaub!").intent).toBe("story");
    expect(detectIntent("Ich würde gern nach Berlin fahren.").intent).toBe("chat");
    expect(detectIntent("Was ist dein Lieblingsessen?").intent).toBe("chat");
  });
});

describe("demo (mock) partner", () => {
  it("has at least 20 varied replies per level, all at the level", () => {
    for (const level of LEVELS) {
      expect(new Set(CHAT_POOL[level]).size, level).toBeGreaterThanOrEqual(20);
      const all = [...CHAT_POOL[level], ...TOPIC_REPLIES[level].flatMap((r) => r.replies)];
      for (const r of all) expect(heuristicCheck(level, r), `${level}: ${r}`).toMatchObject({ ok: true });
    }
  });

  it("explanations and few-shot examples respect the level limits", () => {
    for (const level of LEVELS) {
      for (const [topic, text] of Object.entries(EXPLANATIONS[level])) {
        expect(heuristicCheck(level, text!, { intent: "explain" }), `${level} ${topic}`).toMatchObject({ ok: true });
      }
      const k = LEVEL_KNOWLEDGE[level].examples;
      expect(heuristicCheck(level, k.explain.partner, { intent: "explain" }), `${level} explain`).toMatchObject({ ok: true });
      expect(heuristicCheck(level, k.opinion.partner, { intent: "opinion" }), `${level} opinion`).toMatchObject({ ok: true });
      expect(heuristicCheck(level, k.story.partner, { intent: "story" }), `${level} story`).toMatchObject({ ok: true });
      expect(heuristicCheck(level, k.chat.partner), `${level} chat`).toMatchObject({ ok: true });
    }
  });

  it("explains Modalverben when asked, on every level", () => {
    for (const level of LEVELS) {
      const reply = mockPartnerReply(level, [
        { role: "user", content: START_SIGNAL },
        { role: "assistant", content: "Hallo!" },
        { role: "user", content: "Können Sie Modalverben erklären?" },
      ]);
      expect(reply, level).toMatch(/Modalverb/);
      expect(reply.split(/[.!?]/).length, level).toBeGreaterThan(4);
    }
  });

  it("never repeats a reply within a 25-turn conversation", () => {
    for (const level of LEVELS) {
      const messages: ChatMessage[] = [{ role: "user", content: START_SIGNAL }];
      const said: string[] = [];
      for (let i = 0; i < 25; i++) {
        const r = mockPartnerReply(level, messages);
        said.push(r);
        messages.push({ role: "assistant", content: r }, { role: "user", content: i % 2 ? "Ja, genau." : "Ich arbeite viel." });
      }
      expect(new Set(said.slice(0, 22)).size, level).toBe(22);
      for (let i = 1; i < said.length; i++) expect(said[i], `${level} turn ${i}`).not.toBe(said[i - 1]);
    }
  });
});

describe("partner prompts", () => {
  it("describe a talkative partner who explains, tells stories and gives opinions, at the level", () => {
    for (const level of LEVELS) {
      const p = buildPartnerSystemPrompt({ level, correctionMode: "recast" });
      expect(p).toContain(`LEVEL: ${level}`);
      expect(p).toMatch(/explain grammar/i);
      expect(p).toMatch(/anecdote/i);
      expect(p).toMatch(/opinion/i);
      expect(p).toMatch(/Never repeat a sentence/);
      expect(p).toContain(LEVEL_KNOWLEDGE[level].examples.explain.partner);
      expect(p).toContain("Typical mistakes of Arabic-speaking learners");
      expect(p.includes("(الفعل")).toBe(level === "A1" || level === "A2");
      expect(turnInstruction(level, "explain", "modalverben")).toContain(String(LEVEL_CONFIG[level].limits.maxSentencesLong));
    }
  });
});
