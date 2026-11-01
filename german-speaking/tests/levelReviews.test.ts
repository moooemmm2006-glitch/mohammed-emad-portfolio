import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getDb, resetDbForTests, schema } from "@/lib/db";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";

// 💬 Learners' opinions of a level: only after real progress, one per learner and level, shown only
// once the admin approves; editing sends it back to review; first names only.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-lrev-"));
process.env.DATABASE_PATH = path.join(dir, "lrev.db");
let cookie: string | undefined;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }) }));
const progress = vi.hoisted(() => ({ value: 0 }));
vi.mock("@/lib/skills", async (orig) => ({ ...(await orig<typeof import("@/lib/skills")>()), levelSkillProgress: async () => ({ speak: progress.value, listen: progress.value, read: progress.value, write: progress.value }) }));
const route = await import("@/app/api/level-reviews/route");
const adminRoute = await import("@/app/api/admin/level-reviews/route");

async function makeUser(name: string, role: "admin" | "student" = "student") {
  const db = await getDb(), id = randomUUID(), now = Date.now();
  await db.insert(schema.users).values({ id, name, username: `u-${id.slice(0, 8)}`, role, createdAt: now, tokenVersion: 0 }).run();
  return signToken({ u: id, v: 0, e: now + 3_600_000 });
}
const json = (method: string, body: unknown) => new Request("http://test/x", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
type List = { average: number | null; count: number; reviews: { id: string; name: string; comment: string }[]; mine: { status: string } | null; canWrite: boolean };
const list = async (level = "A1") => (await (await route.GET(new Request(`http://test/x?level=${level}`))).json()) as List;

describe("level opinions", () => {
  let sara: string, admin: string;
  beforeAll(async () => {
    sara = await makeUser("Sara Ahmed");
    admin = await makeUser("Boss", "admin");
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("needs a login", async () => {
    cookie = undefined;
    expect((await route.GET(new Request("http://test/x?level=A1"))).status).toBe(401);
    expect((await route.POST(json("POST", { level: "A1", rating: 5, comment: "Sehr gut!!!!!" }))).status).toBe(401);
    expect((await adminRoute.GET(new Request("http://test/x"))).status).toBe(401);
  });

  it("needs real progress on the level", async () => {
    cookie = sara;
    progress.value = 10;
    expect((await list()).canWrite).toBe(false);
    expect((await route.POST(json("POST", { level: "A1", rating: 5, comment: "Super Niveau, sehr klar." }))).status).toBe(403);
  });

  it("waits for the admin, then shows with the first name; editing sends it back", async () => {
    cookie = sara;
    progress.value = 40;
    expect((await route.POST(json("POST", { level: "A1", rating: 5, comment: "short" }))).status).toBe(400);
    expect((await route.POST(json("POST", { level: "A1", rating: 5, comment: "الشرح واضح والخطة ساعدتني جدًا" }))).status).toBe(201);
    let l = await list();
    expect(l.count).toBe(0);
    expect(l.mine?.status).toBe("pending");

    cookie = sara; // a learner can't moderate
    expect((await adminRoute.GET(new Request("http://test/x"))).status).toBe(403);
    cookie = admin;
    const pending = (await (await adminRoute.GET(new Request("http://test/x?status=pending"))).json()) as { reviews: { id: string }[] };
    expect(pending.reviews).toHaveLength(1);
    expect((await adminRoute.PATCH(json("PATCH", { id: pending.reviews[0].id, status: "approved" }))).status).toBe(200);

    cookie = sara;
    l = await list();
    expect(l).toMatchObject({ count: 1, average: 5 });
    expect(l.reviews[0].name).toBe("Sara");
    expect((await list("A2")).count).toBe(0); // per level

    // rewrite → one row, back to review
    expect((await route.POST(json("POST", { level: "A1", rating: 4, comment: "Gut, aber mehr Videos bitte." }))).status).toBe(201);
    l = await list();
    expect(l.count).toBe(0);
    expect(l.mine?.status).toBe("pending");
  });

  it("the admin can delete", async () => {
    cookie = admin;
    const pending = (await (await adminRoute.GET(new Request("http://test/x?status=pending"))).json()) as { reviews: { id: string }[] };
    expect((await adminRoute.DELETE(new Request(`http://test/x?id=${pending.reviews[0].id}`, { method: "DELETE" }))).status).toBe(200);
    cookie = sara;
    expect((await list()).mine).toBeNull();
  });

  it("an opinion of the whole site needs no progress and still waits for the admin", async () => {
    cookie = sara;
    progress.value = 0;
    expect((await list("SITE")).canWrite).toBe(true);
    expect((await route.POST(json("POST", { level: "site", rating: 5, comment: "أحسن موقع اتعلمت منه ألماني" }))).status).toBe(201);
    expect((await list("SITE")).count).toBe(0);
    cookie = admin;
    const pending = (await (await adminRoute.GET(new Request("http://test/x?status=pending"))).json()) as { reviews: { id: string; level: string }[] };
    const mine = pending.reviews.find((r) => r.level === "SITE")!;
    await adminRoute.PATCH(json("PATCH", { id: mine.id, status: "approved" }));
    cookie = sara;
    expect((await list("SITE")).count).toBe(1);
    expect((await list("A1")).count).toBe(0); // separate from the levels
    expect((await route.GET(new Request("http://test/x?level=C2"))).status).toBe(400);
  });
});
