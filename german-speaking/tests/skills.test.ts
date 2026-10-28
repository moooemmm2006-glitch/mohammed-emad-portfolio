import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import ar from "../messages/ar.json";
import de from "../messages/de.json";
import en from "../messages/en.json";
import { getTopicByNumber, getTopics } from "@/lib/book";
import { blankOut, headWord, makeSectionQuiz, quizScore } from "@/lib/bookQuiz";
import { blankOk, compareWritten, foldWord, makeGap, pickWritingSentences } from "@/lib/bookWrite";
import { resolveFx } from "@/lib/client/fx";
import { resetDbForTests } from "@/lib/db";
import { getWeaknesses } from "@/lib/db/repo";
import { LEVELS } from "@/lib/levels";
import { tagLabel } from "@/lib/tags";
import type { LLM } from "@/lib/llm";
import { levelSkillProgress, saveSkillScore, skillScores } from "@/lib/skills";
import { checkFreeWriting, writingTimeline } from "@/lib/writing";

describe("three interface languages", () => {
  const files = { ar, de, en } as Record<string, Record<string, string>>;
  const keys = Object.keys(ar).sort();

  it("ar, de and en have exactly the same keys, none empty", () => {
    for (const [name, dict] of Object.entries(files)) {
      expect(Object.keys(dict).sort(), name).toEqual(keys);
      for (const k of keys) expect(dict[k].trim(), `${name}.${k}`).not.toBe("");
    }
  });

  it("placeholders like {n} are the same in every language", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const k of keys) {
      expect(ph(de[k as keyof typeof de]), `de.${k}`).toBe(ph(ar[k as keyof typeof ar]));
      expect(ph(en[k as keyof typeof en]), `en.${k}`).toBe(ph(ar[k as keyof typeof ar]));
    }
  });

  it("German really is German (not a copy of English) for normal UI texts", () => {
    const same = keys.filter((k) => de[k as keyof typeof de] === en[k as keyof typeof en] && /[a-z]{4,}/.test(en[k as keyof typeof en]));
    // Allowed: names, German terms and codes that are the same in both.
    expect(same.length).toBeLessThan(30);
  });

  it("level names match the book and tag labels exist in all languages", () => {
    expect([ar.lvl_A1_name, ar.lvl_A2_name, ar.lvl_B1_name, ar.lvl_B2_name]).toEqual(["المبتدئ", "الأساسي", "المتوسط", "فوق المتوسط"]);
    expect(tagLabel("modalverben", "de")).toBe("Modalverben");
    expect(tagLabel("modalverben", "ar")).toBe("أفعال المودال");
    expect(tagLabel("unknown_tag", "en")).toBe("unknown tag");
  });
});

describe("reading quiz from the book", () => {
  it("builds 5 questions per section with 4 distinct options and one right answer", async () => {
    for (const level of LEVELS) {
      for (const topic of (await getTopics(level)).slice(0, 4)) {
        for (const sec of topic.sections) {
          const q = makeSectionQuiz(topic, sec.number, 42);
          expect(q.length).toBe(5);
          for (const x of q) {
            expect(new Set(x.options).size).toBe(4);
            expect(x.answer).toBeGreaterThanOrEqual(0);
            expect(x.answer).toBeLessThan(4);
            const s = sec.sentences.find((y) => y.n === x.n)!;
            expect(s).toBeTruthy(); // questions come from this section
            if (x.kind === "meaning") expect(x.options[x.answer]).toBe(s.ar);
            else expect(x.text.replace("____", x.options[x.answer])).toBe(s.de);
          }
        }
      }
    }
  });

  it("is reproducible with a seed and uses the topic's words for gaps", async () => {
    const t = (await getTopicByNumber(1))!;
    expect(makeSectionQuiz(t, 3, 7)).toEqual(makeSectionQuiz(t, 3, 7));
    expect(headWord("der Vorname")).toBe("Vorname");
    expect(headWord("kommen aus")).toBe("kommen");
    expect(blankOut("Ich komme aus Ägypten.", "komme")).toBe("Ich ____ aus Ägypten.");
    expect(blankOut("Ich bekomme Post.", "komme")).toBeNull(); // whole words only
    const quiz = makeSectionQuiz(t, 3, 7);
    expect(quizScore(quiz, quiz.map((q) => q.answer))).toBe(100);
    expect(quizScore(quiz, quiz.map(() => null))).toBe(0);
  });
});

describe("writing comparison", () => {
  it("ignores case and punctuation and accepts ae/oe/ue/ss with a hint", () => {
    const r = compareWritten("Ich wohne in Köln.", "ich wohne in koeln");
    expect(r.correct).toBe(true);
    expect(r.score).toBe(100);
    expect(r.umlautHint).toBe(true);
    expect(compareWritten("Das ist meine Straße.", "das ist meine strasse").correct).toBe(true);
    const c = compareWritten("Ich habe einen Termin.", "Ich habe einen termin");
    expect(c.correct).toBe(true);
    expect(c.caseHint).toBe(true);
    expect(foldWord("Grüße!")).toBe("gruesse");
  });

  it("marks missing, wrong and extra words", () => {
    const r = compareWritten("Ich komme aus Ägypten und wohne in Berlin.", "Ich komm aus Ägypten wohne gern in Berlin");
    const by = (s: string) => r.words.filter((w) => w.state === s).map((w) => w.text);
    expect(by("wrong")).toEqual(["komme"]);
    expect(r.words.find((w) => w.state === "wrong")?.typed).toBe("komm");
    expect(by("missing")).toEqual(["und"]);
    expect(by("extra")).toEqual(["gern"]);
    expect(r.correct).toBe(false);
    expect(r.score).toBeGreaterThan(50);
    expect(r.score).toBeLessThan(100);
    expect(compareWritten("Guten Morgen!", "").score).toBe(0);
  });

  it("builds 'complete the sentence' gaps from the topic's words", async () => {
    const t = (await getTopicByNumber(1))!;
    const s = t.sections[2].sentences.find((x) => /heiße|Name/.test(x.de))!;
    const g = makeGap(s, t)!;
    expect(g.answers.length).toBeGreaterThan(0);
    expect(g.answers.length).toBeLessThanOrEqual(2);
    let k = 0;
    const rebuilt = g.parts.map((p) => (p === null ? g.answers[k++] : p)).join(" ").replace(/ ([.,!?])/g, "$1");
    expect(rebuilt.replace(/\s+/g, "")).toBe(s.de.replace(/\s+/g, ""));
    expect(blankOk("Straße", "strasse")).toBe(true);
    expect(blankOk("heiße", "heise")).toBe(false);
    expect(pickWritingSentences(t, 3, 8)).toHaveLength(8);
    expect(pickWritingSentences(t, 3, 8)).toEqual(pickWritingSentences(t, 3, 8));
  });
});

describe("3D effects level", () => {
  it("reduced motion always wins; auto is reduced on low-end phones", () => {
    expect(resolveFx("on", true, false)).toBe("off");
    expect(resolveFx("auto", false, false)).toBe("on");
    expect(resolveFx("auto", false, true)).toBe("mild");
    expect(resolveFx("mild", false, false)).toBe("mild");
    expect(resolveFx("off", false, false)).toBe("off");
  });
});

describe("skill progress and free writing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-skills-"));
  let n = 0;
  beforeEach(() => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `s${n++}.db`);
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("keeps the best score per part and turns it into level progress", async () => {
    await saveSkillScore("u", "read", 1, 1, 60);
    await saveSkillScore("u", "read", 1, 1, 90);
    await saveSkillScore("u", "read", 1, 1, 40);
    await saveSkillScore("u", "read", 1, 2, 100);
    await saveSkillScore("u", "write", 1, 0, 85);
    expect(await skillScores("u", "read", [1])).toEqual({ "1:1": 90, "1:2": 100 });
    const p = await levelSkillProgress("u", "A1");
    expect(p.read).toBe(Math.round((100 * 2) / (15 * 5)));
    expect(p.write).toBe(Math.round((100 * 1) / (15 * 2)));
    expect(p.speak).toBe(0);
    expect((await levelSkillProgress("other", "A1")).read).toBe(0);
  });

  it("free writing (with an AI) puts its mistakes into the weakness tracker", async () => {
    const fake: LLM = {
      provider: "anthropic",
      chat: async () => "",
      json: async <T,>() =>
        ({
          corrections: [
            { turn: 1, original: "", corrected: "Ich bin nach Berlin gefahren.", isCorrect: false, natural: null, fixes: [{ wrong: "habe", right: "bin", explanation: "مع أفعال الحركة بنستخدم sein", tag: "perfekt", severity: "high" }] },
            { turn: 2, original: "", corrected: "Es war schön.", isCorrect: true, natural: null, fixes: [] },
          ],
        }) as T,
    };
    const topic = (await getTopicByNumber(20))!;
    const check = await checkFreeWriting("u", topic, "Ich habe nach Berlin gefahren. Es war schön.", fake);
    expect(check.corrections).toHaveLength(2);
    expect(check.counts).toEqual([{ tag: "perfekt", kind: "grammar", count: 1 }]);
    expect((await getWeaknesses("u")).map((w) => w.tag)).toEqual(["perfekt"]);
    expect(await writingTimeline("u")).toHaveLength(1);
    expect(await getWeaknesses("someone-else")).toEqual([]);
  });
});
