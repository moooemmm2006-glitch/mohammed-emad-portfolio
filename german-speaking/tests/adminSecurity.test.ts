import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { getDb, resetDbForTests, schema } from "@/lib/db";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { adminAtSignUp, getUser, signUp, type UserRow } from "@/lib/auth/users";

// Admin dashboard security: every /api/admin handler refuses logged-out visitors (401) and
// learners (403) on the server; the admin keeps every legitimate operation; admin rights only
// come from users.role in the database.

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));

const API_ADMIN = path.resolve(__dirname, "../src/app/api/admin");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? routeFiles(p) : e.name === "route.ts" ? [p] : [];
  });
}

/** Every exported HTTP handler of every admin route, e.g. "users/[id] DELETE". */
async function adminHandlers(): Promise<{ name: string; fn: Handler }[]> {
  const out: { name: string; fn: Handler }[] = [];
  for (const file of routeFiles(API_ADMIN)) {
    const mod = (await import(file)) as Record<string, unknown>;
    for (const m of METHODS) if (typeof mod[m] === "function") out.push({ name: `${path.relative(API_ADMIN, path.dirname(file))} ${m}`, fn: mod[m] as Handler });
  }
  return out;
}

const call = (fn: Handler, method: string, body?: unknown, url = "http://test/api/admin/x?topic=1&id=x", params: Record<string, string> = { id: "x" }) =>
  fn(new Request(url, { method, headers: { "Content-Type": "application/json" }, ...(body === undefined || method === "GET" ? {} : { body: JSON.stringify(body) }) }), { params: Promise.resolve(params) });

describe("who becomes admin", () => {
  it("only an explicitly configured username, or the first account outside production", () => {
    expect(adminAtSignUp("Mohamed", false, { ADMIN_USERNAMES: "mohamed, owner2" })).toBe(true);
    expect(adminAtSignUp("someone", true, { ADMIN_USERNAMES: "mohamed" })).toBe(false); // first, but not listed
    expect(adminAtSignUp("someone", true, { NODE_ENV: "production" })).toBe(false); // empty prod database
    expect(adminAtSignUp("someone", true, { NODE_ENV: "development" })).toBe(true); // local development
    expect(adminAtSignUp("someone", false, { NODE_ENV: "development" })).toBe(false);
    expect(adminAtSignUp("x", true, { ADMIN_USERNAMES: " , ", NODE_ENV: "production" })).toBe(false);
  });
});

describe("admin dashboard access", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-admin-"));
  let n = 0;
  let admin: UserRow;
  let student: UserRow;
  let other: UserRow;
  const as = async (u: UserRow | null) => {
    cookie = u ? await signToken({ u: u.id, v: (await getUser(u.id))!.tokenVersion, e: Date.now() + 60_000 }) : undefined;
  };
  beforeEach(async () => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `a${n++}.db`);
    cookie = undefined;
    admin = await signUp({ name: "Mohamed", username: "mohamed", password: "geheim123" });
    student = await signUp({ name: "Sara", username: "sara", password: "geheim123" });
    other = await signUp({ name: "Omar", username: "omar", password: "geheim123" });
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("finds the admin API (sanity check of the route scan)", async () => {
    const names = (await adminHandlers()).map((h) => h.name);
    expect(names.length).toBeGreaterThanOrEqual(25);
    for (const must of ["users GET", "users/[id] PATCH", "users/[id] DELETE", "users/[id]/password POST", "site PUT", "vlogs POST"]) expect(names).toContain(must);
  });

  it("every admin handler answers 401 without a session and changes nothing", async () => {
    for (const h of await adminHandlers()) {
      const res = await call(h.fn, h.name.split(" ")[1], { disabled: true });
      expect(res.status, h.name).toBe(401);
    }
    expect((await getUser(student.id))?.disabled).toBe(0);
  });

  it("every admin handler answers 403 to a logged-in learner and changes nothing", async () => {
    await as(student);
    const params = { id: other.id };
    for (const h of await adminHandlers()) {
      const res = await call(h.fn, h.name.split(" ")[1], { disabled: true, channelUrl: null }, undefined, params);
      expect(res.status, h.name).toBe(403);
    }
    const o = await getUser(other.id);
    expect(o?.disabled).toBe(0);
    expect(o?.passwordHash).toBe(other.passwordHash); // no password reset happened
  });

  it("a forged or tampered cookie is not a session", async () => {
    const { GET } = await import("@/app/api/admin/users/route");
    cookie = await signToken({ u: admin.id, v: 0, e: Date.now() + 60_000 }, "some-other-secret-of-the-attacker");
    expect((await GET()).status).toBe(401);
    await as(student);
    const [body, sig] = cookie!.split(".");
    const forged = Buffer.from(JSON.stringify({ u: admin.id, v: 0, e: Date.now() + 60_000 })).toString("base64url");
    cookie = `${forged}.${sig}`;
    expect(body).not.toBe(forged);
    expect((await GET()).status).toBe(401);
  });

  it("a role sent by the browser at sign-up is ignored", async () => {
    const signup = await import("@/app/api/auth/signup/route");
    const res = await signup.POST(new Request("http://test/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Eve", username: "eve", password: "geheim123", role: "admin" }) }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { user: { role: string } }).user.role).toBe("student");
  });

  it("in production only ADMIN_USERNAMES become admin, even on an empty database", async () => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `a${n++}.db`);
    vi.stubEnv("NODE_ENV", "production");
    expect((await signUp({ name: "First", username: "first", password: "geheim123" })).role).toBe("student");
    vi.stubEnv("ADMIN_USERNAMES", "owner");
    expect((await signUp({ name: "Owner", username: "Owner", password: "geheim123" })).role).toBe("admin");
    expect((await signUp({ name: "Late", username: "late", password: "geheim123" })).role).toBe("student");
  });

  it("the /admin page gate: login for visitors, denied for learners, the dashboard for the admin", async () => {
    const { requireAdminPage } = await import("@/lib/auth/session");
    expect(await requireAdminPage()).toEqual({ denied: "login" });
    await as(student);
    expect(await requireAdminPage()).toEqual({ denied: "forbidden" });
    await as(admin);
    expect(await requireAdminPage()).toMatchObject({ user: { id: admin.id, role: "admin" } });
  });

  it("the admin keeps every operation: list, suspend, reactivate, reset password, site settings, delete", async () => {
    const users = await import("@/app/api/admin/users/route");
    const user = await import("@/app/api/admin/users/[id]/route");
    const password = await import("@/app/api/admin/users/[id]/password/route");
    const site = await import("@/app/api/admin/site/route");
    const me = await import("@/app/api/me/route");
    await as(admin);

    const list = (await (await users.GET()).json()) as { students: { username: string; role: string }[] };
    expect(list.students.map((s) => s.username).sort()).toEqual(["mohamed", "omar", "sara"]);
    expect(JSON.stringify(list)).not.toMatch(/passwordHash|\$2[aby]\$/); // never a password hash

    const ctx = { params: Promise.resolve({ id: student.id }) };
    const patch = (disabled: boolean) => user.PATCH(new Request("http://test/x", { method: "PATCH", body: JSON.stringify({ disabled }) }), { params: Promise.resolve({ id: student.id }) });

    // suspending ends the learner's session at once
    await as(student);
    const studentCookie = cookie;
    expect((await me.GET(new Request("http://test/api/me"))).status).toBe(200);
    await as(admin);
    expect((await patch(true))!.status).toBe(200);
    cookie = studentCookie;
    expect((await me.GET(new Request("http://test/api/me"))).status).toBe(401);
    await as(admin);
    expect((await patch(false))!.status).toBe(200);
    expect((await getUser(student.id))?.disabled).toBe(0);

    const reset = await password.POST(new Request("http://test/x", { method: "POST" }), ctx);
    expect(reset.status).toBe(200);
    expect(((await reset.json()) as { password: string }).password.length).toBeGreaterThanOrEqual(8);

    const put = await site.PUT(new Request("http://test/x", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ explainer: "https://youtu.be/dQw4w9WgXcQ" }) }));
    expect(put.status).toBe(200);
    const links = (await (await site.GET()).json()) as { links: { explainerId: string | null } };
    expect(links.links.explainerId).toBe("dQw4w9WgXcQ");

    // the admin can't lock out or delete themselves
    expect((await user.DELETE(new Request("http://test/x", { method: "DELETE" }), { params: Promise.resolve({ id: admin.id }) }))!.status).toBe(400);
    expect((await user.DELETE(new Request("http://test/x", { method: "DELETE" }), { params: Promise.resolve({ id: other.id }) }))!.status).toBe(200);
    expect(await getUser(other.id)).toBeUndefined();
  });

  it("losing the admin role in the database takes effect on the next request", async () => {
    const users = await import("@/app/api/admin/users/route");
    await as(admin);
    expect((await users.GET()).status).toBe(200);
    const db = await getDb();
    await db.update(schema.users).set({ role: "student" }).where(eq(schema.users.id, admin.id)).run();
    expect((await users.GET()).status).toBe(403); // same cookie, role re-read from the database
  });

  it("normal learner features keep working", async () => {
    const me = await import("@/app/api/me/route");
    const settings = await import("@/app/api/settings/route");
    await as(student);
    const r = await me.GET(new Request("http://test/api/me"));
    expect(r.status).toBe(200);
    expect(((await r.json()) as { user: { role: string } }).user.role).toBe("student");
    expect((await settings.PUT(new Request("http://test/x", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ focusMinutes: 45 }) }))).status).toBe(200);
  });
});
