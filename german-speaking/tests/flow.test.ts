import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { runPartnerTurn, getHint, toMessages, type TurnEvent } from "@/lib/conversation";
import { resetDbForTests } from "@/lib/db";
import { createSession, exportAll, getTurns, getWeaknesses, importAll, listReports, saveSettings, updateSession } from "@/lib/db/repo";
import { heuristicCheck } from "@/lib/levelLock";
import { MockLLM } from "@/lib/llm/mock";
import { generateReport } from "@/lib/report/generate";
import { computeStats } from "@/lib/stats";
import type { Level } from "@/lib/levels";

const llm = new MockLLM();

async function turn(sessionId: string, text?: string) {
  const events: TurnEvent[] = [];
  await runPartnerTurn({ sessionId, userText: text, emit: (e) => events.push(e), llm, confidence: text ? 0.9 : undefined });
  return events;
}

async function session(level: Level, lines: string[], dayOffset: number) {
  const s = await createSession(level, null, null, "u1");
  const start = Date.now() - dayOffset * 86_400_000;
  await updateSession(s.id, { startedAt: start, lastActiveAt: start });
  await turn(s.id);
  for (const l of lines) await turn(s.id, l);
  await updateSession(s.id, { endedAt: start + 6 * 60_000, lastActiveAt: start + 6 * 60_000 });
  return s.id;
}

describe("conversation + report flow (mock LLM, in-memory DB)", () => {
  // A fresh SQLite file per test (libSQL in-memory databases don't survive batches/transactions).
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-test-"));
  let n = 0;
  const freshDb = () => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `t${n++}.db`);
  };
  beforeEach(freshDb);
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("greets at level, saves turns and streams sentences", async () => {
    const s = await createSession("A1", null, null, "u1");
    const greet = await turn(s.id);
    const done = greet.find((e) => e.type === "done");
    expect(done && done.type === "done" && heuristicCheck("A1", done.text).ok).toBe(true);
    expect(greet.filter((e) => e.type === "sentence").length).toBeGreaterThan(0);

    const reply = await turn(s.id, "Ich heiße Mohammed und ich komme aus Ägypten.");
    expect(reply.at(-1)).toMatchObject({ type: "done" });
    const turns = await getTurns(s.id);
    expect(turns.map((t) => t.role)).toEqual(["partner", "user", "partner"]);
    expect(turns[1].confidence).toBe(0.9);
  });

  it("works in fast (streaming) mode too", async () => {
    await saveSettings({ levelCheckMode: "fast" }, "u1");
    const s = await createSession("B1", null, null, "u1");
    const events = await turn(s.id);
    expect(events.some((e) => e.type === "sentence")).toBe(true);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("explains grammar when asked and never sends the same reply twice in a row", async () => {
    const s = await createSession("A2", null, null, "u1");
    await turn(s.id);
    const ev = await turn(s.id, "Können Sie Modalverben erklären?");
    const done = ev.find((e) => e.type === "done");
    expect(done && done.type === "done" && done.text).toMatch(/Modalverb/);
    const replies: string[] = [];
    for (let i = 0; i < 6; i++) {
      const e = (await turn(s.id, "Ja, ich arbeite heute.")).find((x) => x.type === "done");
      replies.push(e && e.type === "done" ? e.text : "");
    }
    for (let i = 1; i < replies.length; i++) expect(replies[i]).not.toBe(replies[i - 1]);
    const roles = (await getTurns(s.id)).map((t) => t.role);
    expect(roles.slice(0, 4)).toEqual(["partner", "user", "partner", "user"]);
  });

  it("builds valid alternating messages", () => {
    const m = toMessages(
      [
        { role: "partner", text: "Hallo!" },
        { role: "user", text: "Hi" },
        { role: "user", text: "Wie geht's?" },
      ],
      true,
    );
    expect(m.map((x) => x.role)).toEqual(["user", "assistant", "user"]);
    expect(m[2].content).toBe("Hi\nWie geht's?");
    expect(toMessages([{ role: "partner", text: "x" }], false)[0].role).toBe("user");
  });

  it("tracks weaknesses across sessions and compares reports (Day 1 → Day 3)", async () => {
    // Day 1: modal verb word order + Perfekt with haben
    const d1 = await session("A2", ["Ich kann sprechen Deutsch gut.", "Ich muss arbeiten morgen.", "Ich habe nach Berlin gegangen."], 3);
    const r1 = await generateReport(d1, { llm });
    expect(r1.mistakes.map((m) => m.tag)).toEqual(expect.arrayContaining(["modalverben", "perfekt"]));
    expect(r1.sinceLastTime.improved).toEqual([]);
    expect(r1.session.userTurns).toBe(3);

    // Day 2: modal verbs fixed, separable verbs are the new problem
    const d2 = await session("A2", ["Ich kann gut Deutsch sprechen.", "Ich anrufe meine Mutter jeden Tag.", "Ich aufstehe um sieben Uhr."], 2);
    const r2 = await generateReport(d2, { llm });
    expect(r2.trackerChanges?.improved).toEqual(expect.arrayContaining(["modalverben", "perfekt"]));
    expect(r2.trackerChanges?.new).toEqual(["trennbare_verben"]);
    expect(r2.sinceLastTime.improved.length).toBeGreaterThan(0);

    // Day 3: separable verbs fixed too
    const d3 = await session("A2", ["Ich rufe meine Mutter an.", "Ich stehe um sieben Uhr auf."], 1);
    const r3 = await generateReport(d3, { llm });
    expect(r3.trackerChanges?.improved).toContain("trennbare_verben");

    const status = Object.fromEntries((await getWeaknesses("u1")).map((w) => [w.tag, w.status]));
    expect(status.modalverben).toBe("resolved");
    expect(status.trennbare_verben).toBe("improving");

    // Regenerating an old report must not double count it
    await generateReport(d2, { llm });
    expect((await getWeaknesses("u1")).find((w) => w.tag === "trennbare_verben")?.totalCount).toBe(2);

    const stats = await computeStats("u1", 0);
    expect(stats.totals.sessions).toBe(3);
    expect(stats.scoreTimeline).toHaveLength(3);
    expect(stats.levels.A2.sessions).toBe(3);
    expect(stats.totals.streak).toBeGreaterThanOrEqual(1);
  });

  it("refuses a report for an empty session and gives level-safe hints", async () => {
    const s = await createSession("A1", null, null, "u1");
    await turn(s.id);
    await expect(generateReport(s.id, { llm })).rejects.toThrow(/Nothing was said/);
    const hint = await getHint(s.id, llm);
    expect(heuristicCheck("A1", hint.rephrase).ok).toBe(true);
    expect(hint.meaning.length).toBeGreaterThan(0);
  });

  it("exports and re-imports all data", async () => {
    const id = await session("B1", ["Ich arbeite in einem Team mit fünf Kollegen."], 0);
    await generateReport(id, { llm });
    const dump = JSON.parse(JSON.stringify(await exportAll("u1")));
    freshDb();
    await importAll(dump, "u1");
    expect(await listReports("u1")).toHaveLength(1);
    expect((await getTurns(id)).length).toBe(dump.turns.length);
  });
});
