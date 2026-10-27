import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { resetDbForTests } from "@/lib/db";
import { createSession, getSettings, LOCAL_USER, listSessions, saveSettings } from "@/lib/db/repo";
import { SESSION_COOKIE, signToken, verifyToken } from "@/lib/auth/token";
import { AuthError, changePassword, getUser, login, LOGIN_MAX_FAILS, signUp, type UserRow } from "@/lib/auth/users";
import { initialsOf, colorFor } from "@/lib/auth/avatar";
import { updateStudent } from "@/lib/admin";
import { getUsage, limitReached, recordUsage } from "@/lib/usage";
import { sniffImage } from "@/lib/photo";

// Route handlers read the session cookie through next/headers; tests set it here.
let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));

const sessionRoute = await import("@/app/api/sessions/[id]/route");
const sessionsRoute = await import("@/app/api/sessions/route");
const statsRoute = await import("@/app/api/stats/route");
const settingsRoute = await import("@/app/api/settings/route");
const turnRoute = await import("@/app/api/sessions/[id]/turn/route");
const reportRoute = await import("@/app/api/sessions/[id]/report/route");
const adminRoute = await import("@/app/api/admin/users/route");
const meRoute = await import("@/app/api/me/route");
const bookLevelRoute = await import("@/app/api/book/level/[level]/route");
const bookAttemptsRoute = await import("@/app/api/book/attempts/route");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-accounts-"));
let n = 0;
beforeEach(() => {
  resetDbForTests();
  process.env.DATABASE_PATH = path.join(dir, `a${n++}.db`);
  cookie = undefined;
});
afterAll(() => {
  resetDbForTests();
  fs.rmSync(dir, { recursive: true, force: true });
});

async function loginAs(u: UserRow) {
  cookie = await signToken({ u: u.id, v: (await getUser(u.id))!.tokenVersion, e: Date.now() + 60_000 });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (url: string, body?: unknown) =>
  new Request(`http://test${url}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const code = async (r: Response) => ((await r.clone().json()) as { error?: { code: string } }).error?.code;

const pw = "geheim123";

describe("accounts", () => {
  it("validates sign-up and keeps usernames unique", async () => {
    await expect(signUp({ name: "", username: "sara", password: pw })).rejects.toMatchObject({ code: "name_required" });
    await expect(signUp({ name: "Sara", username: "ab", password: pw })).rejects.toMatchObject({ code: "username_invalid" });
    await expect(signUp({ name: "Sara", username: "sara-x", password: pw })).rejects.toMatchObject({ code: "username_invalid" });
    await expect(signUp({ name: "Sara", username: "sara", password: "kurz" })).rejects.toMatchObject({ code: "password_short" });
    await expect(signUp({ name: "Sara", username: "sara", password: pw, confirm: "anders123" })).rejects.toMatchObject({ code: "password_mismatch" });

    const first = await signUp({ name: "Sara", username: "Sara_1", password: pw });
    expect(first.username).toBe("sara_1"); // stored lowercase
    expect(first.role).toBe("admin"); // the first account is the admin
    expect(first.passwordHash).not.toContain(pw);
    expect(first.passwordHash).toMatch(/^\$2[aby]\$/);
    const second = await signUp({ name: "Omar", username: "omar", password: pw });
    expect(second.role).toBe("student");
    await expect(signUp({ name: "Other", username: "SARA_1", password: pw })).rejects.toMatchObject({ code: "username_taken" });
  });

  it("logs in, rejects wrong passwords and rate-limits guessing", async () => {
    await signUp({ name: "Sara", username: "sara", password: pw });
    expect((await login("SARA", pw, "1.1.1.1")).username).toBe("sara");
    await expect(login("nobody", pw, "1.1.1.1")).rejects.toMatchObject({ code: "user_not_found" });
    for (let i = 0; i < LOGIN_MAX_FAILS; i++) await expect(login("sara", "falsch123", "1.1.1.1")).rejects.toMatchObject({ code: "wrong_password" });
    // 6th try is blocked even with the right password…
    const blocked = await login("sara", pw, "1.1.1.1").catch((e: AuthError) => e);
    expect(blocked).toMatchObject({ code: "rate_limited", status: 429 });
    expect((blocked as AuthError).retryAfterSec).toBeGreaterThan(0);
    // …but only for this username + IP.
    expect((await login("sara", pw, "2.2.2.2")).username).toBe("sara");
    // After the window it works again.
    expect((await login("sara", pw, "1.1.1.1", Date.now() + 16 * 60_000)).username).toBe("sara");
  });

  it("signs session tokens and rejects tampered or expired ones", async () => {
    const t = await signToken({ u: "x", v: 0, e: Date.now() + 1000 });
    expect(await verifyToken(t)).toMatchObject({ u: "x", v: 0 });
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "admin", v: 0, e: Date.now() + 1000 })).toString("base64url");
    expect(await verifyToken(`${forged}.${sig}`)).toBeNull();
    expect(await verifyToken(`${body}.${sig}x`)).toBeNull();
    expect(await verifyToken(t, undefined, Date.now() + 5000)).toBeNull();
    expect(await verifyToken(t, "another-secret-of-length")).toBeNull();
  });

  it("changing the password or disabling the account ends old sessions", async () => {
    const admin = await signUp({ name: "Admin", username: "admin", password: pw });
    const u = await signUp({ name: "Omar", username: "omar", password: pw });
    await loginAs(u);
    expect((await meRoute.GET(req("/api/me"))).status).toBe(200);
    await expect(changePassword(u.id, "falsch123", "neuesPasswort")).rejects.toMatchObject({ code: "wrong_current_password" });
    await changePassword(u.id, pw, "neuesPasswort");
    expect((await meRoute.GET(req("/api/me"))).status).toBe(401); // old cookie is dead
    await expect(login("omar", pw, "ip")).rejects.toMatchObject({ code: "wrong_password" });
    await loginAs(await login("omar", "neuesPasswort", "ip"));
    expect((await meRoute.GET(req("/api/me"))).status).toBe(200);

    await updateStudent(u.id, { disabled: true });
    expect((await meRoute.GET(req("/api/me"))).status).toBe(401);
    await expect(login("omar", "neuesPasswort", "ip")).rejects.toMatchObject({ code: "disabled" });
    expect(admin.role).toBe("admin");
  });

  it("gives the first account the data saved before accounts existed", async () => {
    const old = await createSession("A1", "Familie", null, LOCAL_USER);
    await saveSettings({ reportLang: "en" }, LOCAL_USER);
    const first = await signUp({ name: "Mohammed", username: "mohammed", password: pw });
    expect((await listSessions(first.id)).map((s) => s.id)).toEqual([old.id]);
    expect((await getSettings(first.id)).reportLang).toBe("en");
    expect(await listSessions(LOCAL_USER)).toHaveLength(0);
    const second = await signUp({ name: "Mona", username: "mona", password: pw });
    expect(await listSessions(second.id)).toHaveLength(0);
  });

  it("upgrades a database from before accounts and moves its data to the first account", async () => {
    const { createClient } = await import("@libsql/client");
    const c = createClient({ url: `file:${process.env.DATABASE_PATH}` });
    await c.executeMultiple(`CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, created_at INTEGER NOT NULL);
      INSERT INTO users VALUES ('local', NULL, 1);
      CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, level TEXT NOT NULL, topic TEXT, status TEXT NOT NULL,
        started_at INTEGER NOT NULL, ended_at INTEGER, last_active_at INTEGER NOT NULL, summary TEXT,
        summary_upto INTEGER NOT NULL DEFAULT 0, focus_tag TEXT, pending_feedback TEXT);
      INSERT INTO sessions VALUES ('old-1', 'local', 'A1', NULL, 'ended', 1, 2, 2, NULL, 0, NULL, NULL);`);
    c.close();
    const first = await signUp({ name: "Old", username: "old", password: pw });
    expect(first.role).toBe("admin");
    expect((await listSessions(first.id)).map((x) => x.id)).toEqual(["old-1"]);
  });

  it("initials and colours for the profile circle", () => {
    expect(initialsOf("محمد عماد")).toBe("م");
    expect(initialsOf("مريم")).toBe("م");
    expect(initialsOf("Mohammed Emad")).toBe("ME");
    expect(initialsOf("", "sara")).toBe("S");
    expect(colorFor("sara")).toBe(colorFor("sara"));
    expect(colorFor("sara")).not.toBe(colorFor("omar"));
  });

  it("only accepts real image bytes as a profile photo", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe("image/png");
    expect(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("data isolation between two learners", () => {
  it("every API route needs a login", async () => {
    expect((await statsRoute.GET(req("/api/stats"))).status).toBe(401);
    expect((await settingsRoute.GET()).status).toBe(401);
    expect((await sessionsRoute.POST(req("/api/sessions", { level: "A1" }))).status).toBe(401);
    expect((await sessionRoute.GET(req("/x"), ctx("anything"))).status).toBe(401);
    cookie = "forged.cookie";
    expect((await meRoute.GET(req("/api/me"))).status).toBe(401);
  });

  it("two accounts see completely separate data", async () => {
    const a = await signUp({ name: "Sara", username: "sara", password: pw });
    const b = await signUp({ name: "Omar", username: "omar", password: pw });

    await loginAs(a);
    const created = (await (await sessionsRoute.POST(req("/api/sessions", { level: "A2" }))).json()) as { session: { id: string } };
    const sid = created.session.id;
    const greet = await turnRoute.POST(req(`/x`, {}), ctx(sid));
    await greet.text();
    const said = await turnRoute.POST(req(`/x`, { text: "Ich wohne in Kairo und ich arbeite als Ingenieur." }), ctx(sid));
    await said.text();
    expect((await reportRoute.POST(req("/x", {}), ctx(sid))).status).toBe(200);
    await settingsRoute.PUT(new Request("http://test/api/settings", { method: "PUT", body: JSON.stringify({ reportLang: "de" }) }));
    const statsA = (await (await statsRoute.GET(req("/api/stats?tz=0"))).json()) as { totals: { sessions: number } };
    expect(statsA.totals.sessions).toBe(1);

    // Omar sees nothing of Sara's.
    await loginAs(b);
    expect((await sessionRoute.GET(req("/x"), ctx(sid))).status).toBe(404);
    expect(await code(await sessionRoute.DELETE(req("/x"), ctx(sid)))).toBe("not_found");
    expect((await reportRoute.GET(req("/x"), ctx(sid))).status).toBe(404);
    expect((await reportRoute.POST(req("/x", {}), ctx(sid))).status).toBe(404);
    expect((await turnRoute.POST(req("/x", { text: "Hallo" }), ctx(sid))).status).toBe(404);
    const statsB = (await (await statsRoute.GET(req("/api/stats?tz=0"))).json()) as { totals: { sessions: number }; weaknesses: unknown[]; history: unknown[] };
    expect(statsB.totals.sessions).toBe(0);
    expect(statsB.weaknesses).toEqual([]);
    expect(statsB.history).toEqual([]);
    expect(((await (await settingsRoute.GET()).json()) as { reportLang: string }).reportLang).toBe("ar");
    // Students can't open the admin page.
    expect((await adminRoute.GET()).status).toBe(403);

    // Book progress is per user too.
    const levelCtx = { params: Promise.resolve({ level: "A1" }) };
    const omarTopics = (await (await bookLevelRoute.GET(req("/x"), levelCtx)).json()) as { topics: { number: number; progress: { correct: number } }[] };
    expect(omarTopics.topics).toHaveLength(15);
    expect(omarTopics.topics[0].progress.correct).toBe(0);

    // Sara still has hers.
    await loginAs(a);
    const scored = (await (await bookAttemptsRoute.POST(req("/x", { heard: [{ n: 1, said: "Hallo" }, { n: 2, said: "Guten Morgen" }] }))).json()) as { results: { score: number }[] };
    expect(scored.results.map((r) => r.score)).toEqual([100, 100]);
    const saraTopics = (await (await bookLevelRoute.GET(req("/x"), levelCtx)).json()) as { topics: { number: number; progress: { correct: number } }[] };
    expect(saraTopics.topics[0].progress.correct).toBe(2);
    await loginAs(b);
    expect(((await (await bookLevelRoute.GET(req("/x"), levelCtx)).json()) as typeof saraTopics).topics[0].progress.correct).toBe(0);

    await loginAs(a);
    expect((await sessionRoute.GET(req("/x"), ctx(sid))).status).toBe(200);
    const admin = (await (await adminRoute.GET()).json()) as { students: { username: string; sessions: number }[] };
    expect(admin.students.find((s) => s.username === "sara")?.sessions).toBe(1);
    expect(admin.students.find((s) => s.username === "omar")?.sessions).toBe(0);
  });
});

describe("daily usage limits", () => {
  it("stops partner replies at the daily limit with a friendly code", async () => {
    await signUp({ name: "Admin", username: "admin", password: pw });
    const s = await signUp({ name: "Omar", username: "omar", password: pw });
    await updateStudent(s.id, { dailyReplies: 2 });
    await loginAs(s);
    const created = (await (await sessionsRoute.POST(req("/api/sessions", { level: "A1" }))).json()) as { session: { id: string } };
    const id = created.session.id;

    const first = await turnRoute.POST(req("/x", {}), ctx(id));
    expect(first.status).toBe(200);
    await first.text();
    const second = await turnRoute.POST(req("/x", { text: "Ich heiße Omar." }), ctx(id));
    expect(await second.text()).toContain('"type":"done"');
    expect((await getUsage(s.id)).replies).toBe(2);

    const third = await turnRoute.POST(req("/x", { text: "Ich komme aus Kairo." }), ctx(id));
    expect(third.status).toBe(429);
    expect(await code(third)).toBe("usage_limit");

    // Raising the limit lets the student continue.
    await updateStudent(s.id, { dailyReplies: 5 });
    expect((await turnRoute.POST(req("/x", { text: "Ich komme aus Kairo." }), ctx(id))).status).toBe(200);
  });

  it("counts minutes too, resets each day, and never limits the admin", async () => {
    const admin = await signUp({ name: "Admin", username: "admin", password: pw });
    const s = await signUp({ name: "Omar", username: "omar", password: pw });
    await updateStudent(s.id, { dailyMinutes: 10 });
    const user = (await getUser(s.id))!;
    expect(await limitReached(user)).toBeNull();
    await recordUsage(s.id, { replies: 1, ms: 10 * 60_000 });
    expect(await limitReached(user)).toEqual({ kind: "minutes", limit: 10 });
    expect(await limitReached(user, Date.now() + 86_400_000)).toBeNull(); // tomorrow
    await updateStudent(admin.id, { dailyMinutes: 1 });
    await recordUsage(admin.id, { ms: 60 * 60_000 });
    expect(await limitReached((await getUser(admin.id))!)).toBeNull();
  });
});
