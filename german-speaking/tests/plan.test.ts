import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getDb, resetDbForTests, schema } from "@/lib/db";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { getUser, signUp, type UserRow } from "@/lib/auth/users";
import { saveJournalEntry } from "@/lib/journal";
import { addDays, currentIndex, paceInTopics, PLAN_STEP_IDS, planDuration, scheduledIndex, topicDays, topicDone, type PlanState } from "@/lib/planShared";

// 🗺️ Level plan: each topic = a 2-day cycle of six steps; the duration follows the number of topics.

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));
const route = await import("@/app/api/plan/route");

const allDone = (): PlanState[number] => Object.fromEntries(PLAN_STEP_IDS.map((s) => [s, { done: true }]));

describe("plan math", () => {
  it("2 days per topic, a fifth more as spare days, and a review week", () => {
    expect(planDuration(15)).toEqual({ topics: 15, studyDays: 30, bufferDays: 6, reviewDays: 7, totalDays: 43, weeks: 7 }); // A1
    expect(planDuration(25)).toMatchObject({ studyDays: 50, bufferDays: 10, totalDays: 67, weeks: 10 }); // A2
    expect(planDuration(30)).toMatchObject({ studyDays: 60, bufferDays: 12, totalDays: 79, weeks: 12 }); // B1, B2
  });

  it("dates each topic's two days from the start", () => {
    expect(topicDays("2026-11-01", 0)).toEqual(["2026-11-01", "2026-11-02"]);
    expect(topicDays("2026-11-30", 1)).toEqual(["2026-12-02", "2026-12-03"]);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(scheduledIndex("2026-11-01", "2026-10-31", 15)).toBeNull();
    expect(scheduledIndex("2026-11-01", "2026-11-04", 15)).toBe(1);
    expect(scheduledIndex("2026-11-01", "2026-12-31", 15)).toBeNull(); // after the last topic
  });

  it("knows the current topic and whether you are ahead or behind", () => {
    const topics = [1, 2, 3, 4];
    const state: PlanState = { 1: allDone(), 2: { ...allDone(), video: { done: false } } };
    expect(topicDone(state, 1)).toBe(true);
    expect(topicDone(state, 2)).toBe(false);
    expect(currentIndex(state, topics)).toBe(1);
    expect(currentIndex({ 1: allDone(), 2: allDone(), 3: allDone(), 4: allDone() }, topics)).toBe(-1);
    // day 4 (index 3) → two topics due, one done → one behind
    expect(paceInTopics(state, topics, "2026-11-01", "2026-11-04")).toBe(-1);
    // day 2 → one due, one done → on track
    expect(paceInTopics(state, topics, "2026-11-01", "2026-11-02")).toBe(0);
  });
});

describe("plan API", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-plan-"));
  let n = 0;
  let sara: UserRow;
  let omar: UserRow;
  const as = async (u: UserRow | null) => {
    cookie = u ? await signToken({ u: u.id, v: (await getUser(u.id))!.tokenVersion, e: Date.now() + 60_000 }) : undefined;
  };
  const post = (body: unknown) => route.POST(new Request("http://test/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  const get = async (level: string) => (await route.GET(new Request(`http://test/x?level=${level}`))) as Response;
  type Plan = { topics: number[]; start: string | null; state: PlanState; duration: { totalDays: number } };
  beforeEach(async () => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `p${n++}.db`);
    cookie = undefined;
    sara = await signUp({ name: "Sara", username: "sara", password: "geheim123" });
    omar = await signUp({ name: "Omar", username: "omar", password: "geheim123" });
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("needs a login", async () => {
    expect((await get("A1")).status).toBe(401);
    expect((await post({ action: "start", level: "A1", day: "2026-11-01" })).status).toBe(401);
  });

  it("lists the level's topics with its duration; A2 starts at topic 16", async () => {
    await as(sara);
    const a1 = (await (await get("a1")).json()) as Plan;
    expect(a1.topics).toHaveLength(15);
    expect(a1.duration.totalDays).toBe(43);
    expect(a1.start).toBeNull();
    const a2 = (await (await get("A2")).json()) as Plan;
    expect(a2.topics[0]).toBe(16);
    expect(a2.topics).toHaveLength(25);
    expect((await get("C1")).status).toBe(400);
  });

  it("saves the start, ticks and notes per learner", async () => {
    await as(sara);
    expect((await post({ action: "start", level: "A1", day: "2026-11-01" })).status).toBe(200);
    expect((await post({ action: "step", topic: 1, step: "study", done: true })).status).toBe(200);
    expect((await post({ action: "step", topic: 1, step: "mistakes", note: "Ich habe gegeht → Ich bin gegangen" })).status).toBe(200);
    expect((await post({ action: "step", topic: 1, step: "mistakes", done: true })).status).toBe(200); // keeps the note
    const p = (await (await get("A1")).json()) as Plan;
    expect(p.start).toBe("2026-11-01");
    expect(p.state[1].study).toMatchObject({ done: true });
    expect(p.state[1].mistakes).toMatchObject({ done: true, note: "Ich habe gegeht → Ich bin gegangen" });
    // untick
    await post({ action: "step", topic: 1, step: "study", done: false });
    expect(((await (await get("A1")).json()) as Plan).state[1].study?.done).toBe(false);

    await as(omar);
    const other = (await (await get("A1")).json()) as Plan;
    expect(other.start).toBeNull();
    expect(other.state).toEqual({});
  });

  it("ticks writing and Gemini by itself when the site already knows", async () => {
    await saveJournalEntry(sara.id, { topic: 2, level: "A1", text: "Heute habe ich viel gelernt." });
    const db = await getDb();
    await db.insert(schema.geminiSessions).values({ id: "g1", userId: sara.id, level: "A1", topic: 2, video: null, text: "Bericht …", createdAt: Date.now() }).run();
    await as(sara);
    const p = (await (await get("A1")).json()) as Plan;
    expect(p.state[2].write).toMatchObject({ done: true, auto: true });
    expect(p.state[2].gemini).toMatchObject({ done: true, auto: true });
  });

  it("refuses unknown steps and topics, and empty changes", async () => {
    await as(sara);
    expect((await post({ action: "step", topic: 1, step: "dance", done: true })).status).toBe(400);
    expect((await post({ action: "step", topic: 999, step: "study", done: true })).status).toBe(400);
    expect((await post({ action: "step", topic: 1, step: "study" })).status).toBe(400);
    expect((await post({ action: "start", level: "A1", day: "1.11.2026" })).status).toBe(400);
  });
});
