import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import ar from "../messages/ar.json";
import de from "../messages/de.json";
import en from "../messages/en.json";
import { resetDbForTests } from "@/lib/db";
import {
  badgesFor,
  clampMinutes,
  focusStreak,
  formatClock,
  isDone,
  isPaused,
  newBadges,
  parseTimer,
  pauseTimer,
  progressOf,
  remainingMs,
  restartTimer,
  resumeTimer,
  startTimer,
} from "@/lib/focusShared";
import { focusStats, saveFocusSession, statsFromRows } from "@/lib/focus";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { getUser, signUp, type UserRow } from "@/lib/auth/users";

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));
const sessionsRoute = await import("@/app/api/focus/sessions/route");
const sessionRoute = await import("@/app/api/focus/sessions/[id]/route");
const statsRoute = await import("@/app/api/focus/stats/route");
const levelRoute = await import("@/app/api/level/[level]/progress/route");
const settingsRoute = await import("@/app/api/settings/route");

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 28, 10, 0, 0);

describe("timer (end timestamp)", () => {
  it("counts from the end timestamp, not from ticks", () => {
    const t = startTimer("focus", 25, "  20 Sätze  ", T0);
    expect(t).toMatchObject({ phase: "focus", minutes: 25, endsAt: T0 + 25 * MIN, pausedLeft: null, goal: "20 Sätze" });
    expect(remainingMs(t, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(progressOf(t, T0 + 10 * MIN)).toBeCloseTo(0.4);
    expect(isDone(t, T0 + 25 * MIN - 1)).toBe(false);
    // a tab that slept for an hour still knows it's over
    expect(isDone(t, T0 + 85 * MIN)).toBe(true);
    expect(remainingMs(t, T0 + 85 * MIN)).toBe(0);
    expect(progressOf(t, T0 + 85 * MIN)).toBe(1);
  });

  it("clamps the length to 5–180 minutes (breaks may be shorter)", () => {
    expect(clampMinutes(2)).toBe(5);
    expect(clampMinutes(500)).toBe(180);
    expect(clampMinutes(Number.NaN)).toBe(25);
    expect(startTimer("focus", 1, "", T0).minutes).toBe(5);
    expect(startTimer("break", 3, "", T0).minutes).toBe(3);
  });

  it("pause keeps the remaining time, resume continues from it", () => {
    const t = startTimer("focus", 25, "", T0);
    const p = pauseTimer(t, T0 + 5 * MIN);
    expect(isPaused(p)).toBe(true);
    expect(p.endsAt).toBeNull();
    // time passes while paused: nothing changes
    expect(remainingMs(p, T0 + 60 * MIN)).toBe(20 * MIN);
    expect(isDone(p, T0 + 60 * MIN)).toBe(false);
    expect(pauseTimer(p, T0 + 70 * MIN)).toBe(p);
    const r = resumeTimer(p, T0 + 60 * MIN);
    expect(r.endsAt).toBe(T0 + 80 * MIN);
    expect(remainingMs(r, T0 + 70 * MIN)).toBe(10 * MIN);
    expect(resumeTimer(r, T0)).toBe(r);
  });

  it("restart starts the same length again", () => {
    const t = startTimer("focus", 45, "Lesen", T0);
    const r = restartTimer(t, T0 + 30 * MIN);
    expect(r).toMatchObject({ minutes: 45, goal: "Lesen", startedAt: T0 + 30 * MIN, endsAt: T0 + 75 * MIN });
  });

  it("formats the clock", () => {
    expect(formatClock(12 * MIN + 30_000)).toBe("12:30");
    expect(formatClock(59_001)).toBe("01:00");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65 * MIN)).toBe("1:05:00");
  });

  it("trusts only a well-formed stored timer", () => {
    const t = startTimer("focus", 25, "x", T0);
    expect(parseTimer(JSON.parse(JSON.stringify(t)))).toEqual(t);
    expect(parseTimer(JSON.parse(JSON.stringify(pauseTimer(t, T0 + MIN))))).toMatchObject({ pausedLeft: 24 * MIN });
    for (const bad of [null, "x", 5, {}, { ...t, phase: "nap" }, { ...t, minutes: "25" }, { ...t, endsAt: null, pausedLeft: null }, { ...t, startedAt: Infinity }]) expect(parseTimer(bad)).toBeNull();
  });
});

describe("vault: streak and badges", () => {
  it("counts days in a row, still alive if the last one was yesterday", () => {
    const days = new Set(["2026-10-25", "2026-10-26", "2026-10-27"]);
    expect(focusStreak(days, "2026-10-27")).toBe(3);
    expect(focusStreak(days, "2026-10-28")).toBe(3);
    expect(focusStreak(days, "2026-10-29")).toBe(0);
    expect(focusStreak(new Set(["2026-10-31", "2026-11-01"]), "2026-11-01")).toBe(2);
  });

  it("gives badges at 1h / 5h / 10h / 25h / 50h / 100h, and reports only new ones", () => {
    expect(badgesFor(59)).toEqual([]);
    expect(badgesFor(60)).toEqual(["h1"]);
    expect(badgesFor(6000)).toEqual(["h1", "h5", "h10", "h25", "h50", "h100"]);
    expect(newBadges(50, 75)).toEqual(["h1"]);
    expect(newBadges(75, 100)).toEqual([]);
    expect(newBadges(290, 610)).toEqual(["h5", "h10"]);
  });

  it("builds today / week / last 7 days in the learner's time zone", () => {
    const rows = [
      { endedAt: T0, minutes: 25 },
      { endedAt: T0 - 2 * 60 * MIN, minutes: 15 },
      { endedAt: T0 - 86_400_000, minutes: 45 },
      { endedAt: T0 - 10 * 86_400_000, minutes: 30 },
    ];
    const s = statsFromRows(rows, 0, T0);
    expect(s).toMatchObject({ totalMinutes: 115, todayMinutes: 40, weekMinutes: 85, streak: 2, sessions: 4, badges: ["h1"] });
    expect(s.last7).toHaveLength(7);
    expect(s.last7[6]).toEqual({ day: "2026-10-28", minutes: 40 });
    expect(s.last7[5]).toEqual({ day: "2026-10-27", minutes: 45 });
    // UTC+14 (offset −840): 10:00 UTC is already the next day there
    expect(statsFromRows(rows, -840, T0).last7[6].day).toBe("2026-10-29");
  });
});

describe("texts", () => {
  it("has the same timer keys in ar / de / en", () => {
    const keys = (o: object) => Object.keys(o).filter((k) => /^(focus_|vault_|badge_h|set_focus|set_break|level_focus)/.test(k)).sort();
    expect(keys(ar).length).toBeGreaterThan(50);
    expect(keys(de)).toEqual(keys(ar));
    expect(keys(en)).toEqual(keys(ar));
    expect(ar.focus_title).toBe("عايز تركّز قد إيه؟");
    expect(ar.focus_start).toBe("يلا نبدأ 💪");
    expect(ar.focus_break_over).toBe("الاستراحة خلصت 😊 يلا نكمل؟");
    expect("gem_qr_alt" in ar).toBe(false);
  });
});

describe("focus sessions API", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-focus-"));
  let n = 0;
  let sara: UserRow;
  let omar: UserRow;
  const as = async (u: UserRow) => {
    cookie = await signToken({ u: u.id, v: (await getUser(u.id))!.tokenVersion, e: Date.now() + 60_000 });
  };
  const send = (method: string, body?: unknown, url = "http://test/x") => new Request(url, { method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const id = (v: string) => ({ params: Promise.resolve({ id: v }) });
  beforeEach(async () => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `f${n++}.db`);
    cookie = undefined;
    sara = await signUp({ name: "Sara", username: "sara", password: "geheim123" });
    omar = await signUp({ name: "Omar", username: "omar", password: "geheim123" });
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("needs a login", async () => {
    expect((await sessionsRoute.POST(send("POST", { startedAt: Date.now() - 25 * MIN, minutes: 25 }))).status).toBe(401);
    expect((await statsRoute.GET(send("GET"))).status).toBe(401);
    expect((await sessionRoute.PATCH(send("PATCH", { goalDone: true }), id("x"))).status).toBe(401);
  });

  it("saves a session, answers with stats and new badges, and counts it for the level", async () => {
    await as(sara);
    const res = await sessionsRoute.POST(send("POST", { startedAt: Date.now() - 61 * MIN, minutes: 60, goal: "20 Sätze", level: "A2", tz: 0 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; stats: { totalMinutes: number; todayMinutes: number; streak: number }; newBadges: string[] };
    expect(body.stats).toMatchObject({ totalMinutes: 60, streak: 1 });
    expect(body.newBadges).toEqual(["h1"]);

    expect((await sessionRoute.PATCH(send("PATCH", { goalDone: true }), id(body.id))).status).toBe(200);
    const lvl = (await (await levelRoute.GET(send("GET"), { params: Promise.resolve({ level: "a2" }) })).json()) as { focusMinutes: number };
    expect(lvl.focusMinutes).toBe(60);
    const a1 = (await (await levelRoute.GET(send("GET"), { params: Promise.resolve({ level: "a1" }) })).json()) as { focusMinutes: number };
    expect(a1.focusMinutes).toBe(0);

    const stats = (await (await statsRoute.GET(send("GET", undefined, "http://test/x?tz=0"))).json()) as { sessions: number; badges: string[] };
    expect(stats).toMatchObject({ sessions: 1, badges: ["h1"] });

    // other learners can't see or change it
    await as(omar);
    expect((await sessionRoute.PATCH(send("PATCH", { goalDone: false }), id(body.id))).status).toBe(404);
    expect(((await (await statsRoute.GET(send("GET"))).json()) as { sessions: number }).sessions).toBe(0);
  });

  it("only stores real time: minutes are capped by the time since the start; a start in the future is refused", async () => {
    const now = Date.now();
    const r = await saveFocusSession(sara.id, { startedAt: now - 10 * MIN, minutes: 180 }, 0, now);
    expect(r.stats.totalMinutes).toBe(10);
    expect((await focusStats(sara.id, 0, now)).sessions).toBe(1);

    await as(sara);
    expect((await sessionsRoute.POST(send("POST", { startedAt: Date.now() + 5 * MIN, minutes: 25 }))).status).toBe(400);
    expect((await sessionsRoute.POST(send("POST", { startedAt: Date.now() - 25 * MIN, minutes: 999 }))).status).toBe(400);
    expect((await sessionsRoute.POST(send("POST", { startedAt: Date.now() - 25 * MIN, minutes: 25, level: "C9" }))).status).toBe(400);
  });

  it("keeps the timer settings, and saving one doesn't reset the others", async () => {
    await as(sara);
    expect((await settingsRoute.PUT(send("PUT", { focusMinutes: 45, breakMinutes: 10 }))).status).toBe(200);
    expect((await settingsRoute.PUT(send("PUT", { focusSound: false }))).status).toBe(200);
    const s = (await (await settingsRoute.GET()).json()) as Record<string, unknown>;
    expect(s).toMatchObject({ focusMinutes: 45, breakMinutes: 10, focusSound: false, focusBreak: true });
    expect((await settingsRoute.PUT(send("PUT", { breakMinutes: 7 }))).status).toBe(400);
    expect((await settingsRoute.PUT(send("PUT", { focusMinutes: 2 }))).status).toBe(400);
  });
});
