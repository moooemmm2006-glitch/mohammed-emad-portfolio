import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { runPartnerTurn, type TurnEvent } from "@/lib/conversation";
import { resetDbForTests } from "@/lib/db";
import { createSession } from "@/lib/db/repo";
import { detectIntent } from "@/lib/intent";
import { LEVEL_KNOWLEDGE } from "@/lib/levelKnowledge";
import { heuristicCheck, stripArabicHints } from "@/lib/levelLock";
import { LEVEL_CONFIG, LEVELS, type Level } from "@/lib/levels";
import type { ChatMessage, ChatParams, JsonParams, LLM } from "@/lib/llm";
import { CHAT_POOL, contentKeyword, EXPLANATIONS, MockLLM, mockPartnerReply, TOPIC_REPLIES } from "@/lib/llm/mock";
import { buildPartnerSystemPrompt, START_SIGNAL, turnInstruction } from "@/lib/prompts";

describe("intent detection", () => {
  it("recognises explanation requests in many spoken variants, case-insensitive", () => {
    const cases: [string, string | null][] = [
      ["Was bedeutet Modalverben?", "modalverben"],
      ["was bedeuten modalverben", "modalverben"],
      ["WAS SIND MODALVERBEN", "modalverben"],
      ["Können Sie Modalverben erklären?", "modalverben"],
      ["kannst du mir modal verben erklären", "modalverben"],
      ["Erkläre mir bitte trennbare Verben", "trennbar"],
      ["Was ist das Perfekt?", "perfekt"],
      ["wie benutzt man das Präteritum", "praeteritum"],
      ["Wann benutze ich Dativ?", "dativ"],
      ["was ist akkusativ", "akkusativ"],
      ["der die das ist so schwer, erklär mal", "artikel"],
      ["Warum steht das Verb auf Position 2?", "wortstellung"],
      ["Wie funktionieren Sätze mit weil?", "nebensatz"],
      ["Adjektivendungen bitte", "adjektiv"],
      ["Was ist Konjunktiv?", "konjunktiv"],
      ["welche Fragewörter gibt es", "fragewoerter"],
      ["اشرح لي الموديل فيربين", null],
      ["يعني ايه Modalverben", "modalverben"],
      ["Was bedeutet Feierabend?", null],
    ];
    for (const [q, topic] of cases) expect(detectIntent(q), q).toEqual({ intent: "explain", topic });
  });

  it("recognises opinions, stories, questions and normal chat", () => {
    expect(detectIntent("Was hältst du von Homeoffice?").intent).toBe("opinion");
    expect(detectIntent("Erzähl mal einen Witz!").intent).toBe("story");
    expect(detectIntent("Was ist dein Lieblingsessen?").intent).toBe("question");
    expect(detectIntent("Wie geht es dir").intent).toBe("question");
    expect(detectIntent("Ich würde gern nach Berlin fahren.").intent).toBe("chat");
    expect(detectIntent("Mit wem gehst du ins Kino?").intent).toBe("question");
  });
});

describe("demo (mock) partner", () => {
  it("has at least 20 varied replies per level, all at the level", () => {
    for (const level of LEVELS) {
      expect(new Set(CHAT_POOL[level]).size, level).toBeGreaterThanOrEqual(20);
      for (const r of [...CHAT_POOL[level], ...TOPIC_REPLIES[level].flatMap((x) => x.replies)]) {
        expect(heuristicCheck(level, r), `${level}: ${r}`).toMatchObject({ ok: true });
      }
    }
  });

  it("has a level-appropriate explanation for at least 12 topics on every level", () => {
    for (const level of LEVELS) {
      const topics = Object.keys(EXPLANATIONS[level]).filter((k) => k !== "generic");
      expect(topics.length, level).toBeGreaterThanOrEqual(12);
      for (const [topic, text] of Object.entries(EXPLANATIONS[level])) {
        expect(heuristicCheck(level, text, { intent: "explain" }), `${level} ${topic}`).toMatchObject({ ok: true });
      }
    }
  });

  it("few-shot examples respect the level limits", () => {
    for (const level of LEVELS) {
      const k = LEVEL_KNOWLEDGE[level].examples;
      expect(heuristicCheck(level, k.explain.partner, { intent: "explain" }), `${level} explain`).toMatchObject({ ok: true });
      expect(heuristicCheck(level, k.opinion.partner, { intent: "opinion" }), `${level} opinion`).toMatchObject({ ok: true });
      expect(heuristicCheck(level, k.story.partner, { intent: "story" }), `${level} story`).toMatchObject({ ok: true });
      expect(heuristicCheck(level, k.chat.partner), `${level} chat`).toMatchObject({ ok: true });
    }
  });

  it("answers 'Was bedeutet Modalverben?' with the Modalverben explanation — also when asked again and again", () => {
    for (const level of LEVELS) {
      const messages: ChatMessage[] = [
        { role: "user", content: START_SIGNAL },
        { role: "assistant", content: "Hallo!" },
      ];
      for (const q of ["Was bedeutet Modalverben?", "Was bedeutet Modalverben?", "Können Sie Modalverben erklären?"]) {
        messages.push({ role: "user", content: q });
        const reply = mockPartnerReply(level, messages);
        expect(reply, `${level}: ${q}`).toBe(EXPLANATIONS[level].modalverben);
        messages.push({ role: "assistant", content: reply });
      }
    }
  });

  it("reacts to the content of the message instead of an unrelated question", () => {
    const r = mockPartnerReply("A2", [
      { role: "user", content: START_SIGNAL },
      { role: "assistant", content: "Hallo!" },
      { role: "user", content: "Ich spiele gern Schach mit meinem Vater." },
    ]);
    expect(r).toContain("Schach");
    expect(contentKeyword("Ich habe heute einen Kuchen gebacken")).toBe("Kuchen");
    expect(mockPartnerReply("A1", [{ role: "user", content: "Wie geht es dir?" }])).toMatch(/Mir geht es gut/);
  });

  it("never repeats a reply twice in a row during a long conversation", () => {
    for (const level of LEVELS) {
      const messages: ChatMessage[] = [{ role: "user", content: START_SIGNAL }];
      const said: string[] = [];
      for (let i = 0; i < 25; i++) {
        const r = mockPartnerReply(level, messages);
        said.push(r);
        messages.push({ role: "assistant", content: r }, { role: "user", content: i % 2 ? "Ja, genau." : "Ich arbeite viel." });
      }
      for (let i = 1; i < said.length; i++) expect(said[i], `${level} turn ${i}`).not.toBe(said[i - 1]);
    }
  });
});

describe("partner prompts", () => {
  it("make the partner answer the actual question and explain fully, only the language is limited", () => {
    for (const level of LEVELS) {
      const p = buildPartnerSystemPrompt({ level, correctionMode: "recast", weaknesses: ["modalverben"] });
      expect(p).toContain(`LEVEL: ${level}`);
      expect(p).toMatch(/ALWAYS respond to the learner's last message first/);
      expect(p).toMatch(/NEVER ignore or deflect a question/);
      expect(p).toMatch(/3 to 5 short example sentences/);
      expect(p).toMatch(/typical mistake/);
      expect(p).toMatch(/Ach so!/);
      expect(p).toContain("Open weak points: Modal verbs");
      expect(p).toContain(LEVEL_KNOWLEDGE[level].examples.explain.partner);
      const ins = turnInstruction(level, "explain", "modalverben");
      expect(ins).toContain("modalverben");
      expect(ins).toContain("Do not change the topic");
      expect(ins.includes("Arabic")).toBe(level === "A1" || level === "A2");
    }
  });
});

// A fake "real" model that records what it was asked, to check the explanation path end-to-end.
class RecordingLLM implements LLM {
  provider = "anthropic" as const;
  calls: ChatParams[] = [];
  constructor(private reply: (p: ChatParams) => string) {}
  async chat(p: ChatParams) {
    this.calls.push(p);
    const text = this.reply(p);
    p.onText?.(text);
    return text;
  }
  async json<T>(p: JsonParams<T>): Promise<T> {
    return p.schema.parse({ ok: true, violations: [], simplified: null });
  }
}

describe("explanation path with a (mocked) real model", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-partner-"));
  let n = 0;
  beforeEach(() => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `t${n++}.db`);
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = async (level: Level, llm: LLM, texts: string[]) => {
    const s = await createSession(level, null, null, "u1");
    const done: string[] = [];
    for (const t of [undefined, ...texts]) {
      const ev: TurnEvent[] = [];
      await runPartnerTurn({ sessionId: s.id, userText: t, emit: (e) => ev.push(e), llm });
      const d = ev.find((e) => e.type === "done");
      done.push(d && d.type === "done" ? d.text : "");
    }
    return done;
  };

  it("'Was bedeutet Modalverben?' gets the explanation instruction, enough tokens, and the explanation is kept", async () => {
    const explanation = EXPLANATIONS.A2.modalverben;
    const llm = new RecordingLLM((p) => (p.messages.at(-1)?.content === START_SIGNAL ? "Hallo! Wie geht's?" : explanation));
    const done = await run("A2", llm, ["Was bedeutet Modalverben?", "Was bedeutet Modalverben?"]);
    const partnerCalls = llm.calls.filter((c) => c.purpose === "partner");
    for (const call of partnerCalls.slice(1)) {
      expect(call.system).toMatch(/asked for an explanation of: modalverben/);
      expect(call.maxTokens).toBeGreaterThanOrEqual(600);
    }
    // Both times the full explanation goes out — asking again is not a "repeat" to be replaced.
    expect(done[1]).toBe(explanation);
    expect(done[2]).toBe(explanation);
  });

  it("keeps the Arabic explanation sentence for A1 on screen but not in speech", async () => {
    const llm = new MockLLM();
    const done = await run("A1", llm, ["Was bedeutet Modalverben?"]);
    expect(done[1]).toContain("يعني الفعل التاني بيروح آخر الجملة.");
    expect(stripArabicHints(done[1])).not.toMatch(/[؀-ۿ]/);
    expect(LEVEL_CONFIG.A1.limits.maxTokensLong).toBeGreaterThanOrEqual(600);
  });
});
