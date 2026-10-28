import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import nextConfig from "../next.config";
import ar from "../messages/ar.json";
import de from "../messages/de.json";
import en from "../messages/en.json";
import { resetDbForTests } from "@/lib/db";
import { exportAll, getTurns, importAll, listReports } from "@/lib/db/repo";
import { saveGeminiSession } from "@/lib/gemini";
import { computeStats, dayKey, practiceDays } from "@/lib/stats";
import { insertPastSession } from "./helpers";

// v11: conversations happen only in Gemini; the in-site conversation is gone.

const ROOT = path.resolve(__dirname, "..");
function filesIn(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesIn(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

describe("no in-site conversation left", () => {
  const src = filesIn(path.join(ROOT, "src"));
  const code = src.map((f) => fs.readFileSync(f, "utf8")).join("\n");

  it("has no conversation screen, chat page, mock partner or conversation API routes", () => {
    const rel = src.map((f) => path.relative(ROOT, f));
    expect(rel.filter((f) => /Conversation\.tsx|\/Avatar\.tsx|level\/\[level\]\/chat|api\/sessions|llm\/mock|conversation\.ts|bookScript|videoTalk|levelLock|prompts\.ts|features\.ts/.test(f))).toEqual([]);
    for (const s of ["/api/sessions", "runPartnerTurn", "MockLLM", "NEXT_PUBLIC_AI_CHAT_ENABLED", "chatPath", "useTalkAboutVideo"]) expect(code, s).not.toContain(s);
    expect(fs.readFileSync(path.join(ROOT, ".env.example"), "utf8")).not.toMatch(/AI_CHAT|LLM_PROVIDER|CHAT_MODEL/);
  });

  it("no texts for the removed conversation in any language", () => {
    for (const dict of [ar, de, en] as Record<string, string>[]) {
      const all = Object.values(dict).join("\n");
      for (const s of ["ابدأ المحادثة في الموضوع", "الشريك هيسألك أسئلة الكتاب", "محادثة حرة", "ابدأ أتكلم", "اتكلم معي", "وضع تجريبي", "Gespräch starten"]) expect(all, s).not.toContain(s);
      expect(Object.keys(dict).filter((k) => /^(conv_|talk_|ctopic_|mock_|avatar_)/.test(k) && k !== "conv_you")).toEqual([]);
    }
    expect(ar.tab_gemini).toContain("Gemini");
    expect(ar.gem_desktop_note).toBe("على اللابتوب Gemini بيرد بالكتابة. للمحادثة الصوتية افتح تطبيق Gemini على الموبايل 📱");
    expect(ar.gem_mobile_note).toBe("دوس ابدأ مع Gemini، الصق التعليمات، وبعدين دوس على أيقونة Live 〰️ واتكلم");
    expect(ar.gem_mic_help).toBe("لو المايك مش شغال: اسمح للمايكروفون من إعدادات المتصفح أو التطبيق.");
  });

  it("old conversation addresses redirect (301) to the level or topic page", async () => {
    const list = await nextConfig.redirects!();
    const to = (source: string) => list.find((r) => r.source === source);
    expect(to("/level/:level/chat")).toMatchObject({ destination: "/level/:level", statusCode: 301 });
    expect(to("/level/:level/chat/:rest*")).toMatchObject({ destination: "/level/:level", statusCode: 301 });
    expect(to("/level/:level/talk")).toMatchObject({ destination: "/level/:level", statusCode: 301 });
    expect(to("/speak/:level/chat")).toMatchObject({ destination: "/level/:level", statusCode: 301 });
    expect(to("/level/:level/topic/:n/talk")).toMatchObject({ destination: "/level/:level/topic/:n?tab=gemini", statusCode: 301 });
    for (const r of list) expect("statusCode" in r && r.statusCode).toBe(301);
  });
});

describe("past reports, streak and data", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-v11-"));
  let n = 0;
  beforeEach(() => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `d${n++}.db`);
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("the streak counts any practice day (a Gemini report today, an old conversation yesterday)", async () => {
    const now = Date.UTC(2026, 9, 28, 12);
    await insertPastSession("u", { at: now - 86_400_000 });
    await saveGeminiSession("u", { level: "A1", text: "Bericht" }, now);
    const days = await practiceDays("u", 0);
    expect(days.has(dayKey(now, 0))).toBe(true);
    const stats = await computeStats("u", 0, now);
    expect(stats.totals.streak).toBe(2);
    expect(stats.history).toHaveLength(1); // the old conversation is still listed (read-only)
    expect((await computeStats("someone-else", 0, now)).totals.streak).toBe(0);
  });

  it("exports and re-imports past conversations and their reports", async () => {
    const id = await insertPastSession("u");
    const dump = JSON.parse(JSON.stringify(await exportAll("u")));
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `d${n++}.db`);
    await importAll(dump, "u");
    expect(await listReports("u")).toHaveLength(1);
    expect(await getTurns(id)).toHaveLength(2);
  });
});
