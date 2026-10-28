import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { GEMINI_URL, geminiPrompt, LEVEL_RULES, VOCAB_IN_PROMPT } from "../data/gemini-prompts";
import { getTopics } from "@/lib/book";
import { resetDbForTests } from "@/lib/db";
import { deleteGeminiSession, geminiCount, GEMINI_SPEAK_MAX, listGeminiSessions, saveGeminiSession } from "@/lib/gemini";
import { LEVELS } from "@/lib/levels";
import { levelSkillProgress } from "@/lib/skills";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { getUser, signUp } from "@/lib/auth/users";

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));
const sessionsRoute = await import("@/app/api/gemini/sessions/route");
const sessionRoute = await import("@/app/api/gemini/sessions/[id]/route");

describe("Gemini prompts", () => {
  it("one prompt per level, with the level and its rules, ending with the start line", () => {
    expect(GEMINI_URL).toBe("https://gemini.google.com/app");
    for (const level of LEVELS) {
      const p = geminiPrompt(level);
      expect(p.startsWith("Du bist mein freundlicher Deutsch-Gesprächspartner.")).toBe(true);
      expect(p).toContain(`lerne Deutsch auf Niveau ${level}.`);
      expect(p).toContain(`1. Sprich NUR auf Niveau ${level}. ${LEVEL_RULES[level]}`);
      expect(p).toContain('5. Wenn ich "مش فاهم" oder "Hilfe" sage');
      expect(p).toContain('6. Wenn ich "Bericht" sage');
      expect(p.trimEnd().endsWith("Fang jetzt an: Begrüße mich kurz und frag mich, worüber ich sprechen möchte.")).toBe(true);
      expect(p).not.toContain("Unser Thema");
      expect(p).not.toMatch(/\{[A-Z_]+\}/); // every placeholder filled
    }
    expect(LEVEL_RULES.A1).toContain("max. 8–10 Wörter");
    expect(LEVEL_RULES.B2).toContain("Kein C1/C2-Stil");
  });

  it("topic prompts use the book topic: titles, the first 10 words and its grammar", async () => {
    for (const level of LEVELS) {
      const topic = (await getTopics(level))[0];
      const vocab = topic.vocab.map((v) => v.de);
      const p = geminiPrompt(level, { kind: "topic", title_de: topic.title_de, title_ar: topic.title_ar, vocab, grammar: topic.grammar.map((g) => g.title_de) });
      expect(p).toContain(`Unser Thema: "${topic.title_de}" (${topic.title_ar}). Bleib bei diesem Thema.`);
      expect(p).toContain(`Nutze diese Wörter: ${vocab.slice(0, VOCAB_IN_PROMPT).join(", ")}.`);
      if (vocab.length > VOCAB_IN_PROMPT) expect(p).not.toContain(`, ${vocab[VOCAB_IN_PROMPT]}.`);
      for (const g of topic.grammar) expect(p).toContain(g.title_de);
      // The topic part comes before the start line.
      expect(p.indexOf("Unser Thema")).toBeLessThan(p.indexOf("Fang jetzt an"));
      expect(p).toContain(`Niveau ${level}`);
    }
  });

  it("every one of the 100 book topics gets a prompt with its level and topic (German + Arabic)", async () => {
    for (const level of LEVELS) {
      for (const topic of await getTopics(level)) {
        const p = geminiPrompt(level, { kind: "topic", title_de: topic.title_de, title_ar: topic.title_ar, vocab: topic.vocab.map((v) => v.de), grammar: topic.grammar.map((g) => g.title_de) });
        expect(p).toContain(`auf Niveau ${level}.`);
        expect(p).toContain(`Unser Thema: "${topic.title_de}" (${topic.title_ar})`);
        expect(p).toContain(LEVEL_RULES[level]);
      }
    }
  });

  it("video prompts name the video", () => {
    const p = geminiPrompt("A2", { kind: "video", title: "Nicos Weg A2 – Film" });
    expect(p).toContain('Unser Thema ist das Video "Nicos Weg A2 – Film". Frag mich, was ich gesehen habe');
    expect(p).toContain("Niveau A2");
  });
});

describe("Gemini sessions", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-gemini-"));
  let n = 0;
  beforeEach(() => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `g${n++}.db`);
    cookie = undefined;
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("stores pasted reports per user, newest first, and counts them in Sprechen", async () => {
    const report = "أخطائي:\nIch habe gegangen → Ich bin gegangen\n\nTipps: ...";
    await saveGeminiSession("u", { level: "A1", text: report }, 1000);
    await saveGeminiSession("u", { level: "A1", topic: 3, text: "  zweiter Bericht  " }, 2000);
    await saveGeminiSession("u", { level: "B2", video: "Video-Thema X", text: "B2" }, 3000);
    await saveGeminiSession("other", { level: "A1", text: "fremd" });

    const list = await listGeminiSessions("u");
    expect(list.map((s) => s.text)).toEqual(["B2", "zweiter Bericht", report]); // trimmed, line breaks kept
    expect(list[1]).toMatchObject({ level: "A1", topic: 3, video: null });
    expect(list[0]).toMatchObject({ level: "B2", topic: null, video: "Video-Thema X" });
    expect(await geminiCount("u", "A1")).toBe(2);

    const before = (await levelSkillProgress("nobody", "A1")).speak;
    expect(before).toBe(0);
    expect((await levelSkillProgress("u", "A1")).speak).toBe(4); // 2 sessions × 2
    for (let i = 0; i < 20; i++) await saveGeminiSession("u", { level: "A1", text: "x" });
    expect((await levelSkillProgress("u", "A1")).speak).toBe(GEMINI_SPEAK_MAX); // capped

    expect(await deleteGeminiSession("other", list[0].id)).toBe(false); // not theirs
    expect(await deleteGeminiSession("u", list[0].id)).toBe(true);
    expect(await geminiCount("u", "B2")).toBe(0);
  });

  it("the API needs a login, validates, saves and deletes", async () => {
    const res = await sessionsRoute.GET();
    expect(res.status).toBe(401);
    const user = await signUp({ name: "Sara", username: "sara", password: "geheim123" });
    cookie = await signToken({ u: user.id, v: (await getUser(user.id))!.tokenVersion, e: Date.now() + 60_000 });
    const post = (body: unknown) => sessionsRoute.POST(new Request("http://test/api/gemini/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

    expect((await post({ level: "C1", text: "x" })).status).toBe(400);
    expect((await post({ level: "A1", text: "   " })).status).toBe(400);
    const ok = await post({ level: "A2", topic: 20, text: "تقرير" });
    expect(ok.status).toBe(200);
    const { session } = (await ok.json()) as { session: { id: string } };
    const listed = (await (await sessionsRoute.GET()).json()) as { sessions: { id: string; text: string; topic: number }[] };
    expect(listed.sessions).toEqual([expect.objectContaining({ id: session.id, text: "تقرير", topic: 20 })]);

    const ctx = { params: Promise.resolve({ id: session.id }) };
    expect((await sessionRoute.DELETE(new Request("http://test"), ctx)).status).toBe(200);
    expect((await sessionRoute.DELETE(new Request("http://test"), ctx)).status).toBe(404);
  });

});
