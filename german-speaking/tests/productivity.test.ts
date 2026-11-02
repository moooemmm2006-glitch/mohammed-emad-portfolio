import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getDb, resetDbForTests, schema } from "@/lib/db";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { cleanChannelUrl, cleanHttpsUrl, subscribeUrl } from "@/lib/productivityShared";

// 🎯 Productivity section: login to read, admin to edit; one channel link per creator.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-prod-"));
process.env.DATABASE_PATH = path.join(dir, "prod.db");
let cookie: string | undefined;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }) }));
vi.mock("@/lib/site", async (orig) => ({ ...(await orig<typeof import("@/lib/site")>()), youtubeOEmbed: async () => ({ title: "Plan your week", author: "x", authorUrl: "" }) }));
const route = await import("@/app/api/productivity/route");
const admin = await import("@/app/api/admin/productivity/route");

async function makeUser(role: "admin" | "student") {
  const db = await getDb(), id = randomUUID(), now = Date.now();
  await db.insert(schema.users).values({ id, name: role, username: `u-${id.slice(0, 8)}`, role, createdAt: now, tokenVersion: 0 }).run();
  return signToken({ u: id, v: 0, e: now + 3_600_000 });
}
const req = (method: string, body: unknown) => new Request("http://test/x", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
type Items = { items: { id: string; kind: string; title: string; url: string; youtubeId: string | null }[] };

describe("productivity links", () => {
  it("cleans links", () => {
    expect(cleanHttpsUrl("http://x.com")).toBeNull();
    expect(cleanHttpsUrl("https://user:pw@x.com")).toBeNull();
    expect(cleanChannelUrl("https://www.youtube.com/@someone/videos")).toBe("https://www.youtube.com/@someone");
    expect(cleanChannelUrl("youtube.com/channel/UC123")).toBe("https://www.youtube.com/channel/UC123");
    expect(cleanChannelUrl("https://evil.com/@someone")).toBeNull();
    expect(subscribeUrl("https://www.youtube.com/@a")).toBe("https://www.youtube.com/@a?sub_confirmation=1");
  });
});

describe("productivity API", () => {
  let student: string, boss: string;
  beforeAll(async () => {
    student = await makeUser("student");
    boss = await makeUser("admin");
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("needs login to read and admin to write", async () => {
    cookie = undefined;
    expect((await route.GET()).status).toBe(401);
    cookie = student;
    expect((await route.GET()).status).toBe(200);
    expect((await admin.POST(req("POST", { creator: "abdaal", kind: "course", link: "https://x.com", title: "C" }))).status).toBe(403);
  });

  it("adds videos, courses and one channel per creator", async () => {
    cookie = boss;
    const v = (await (await admin.POST(req("POST", { creator: "abouzeid", kind: "video", link: "https://youtu.be/LSfqMq72Qjk" }))).json()) as Items;
    expect(v.items[0]).toMatchObject({ kind: "video", youtubeId: "7nmKtI7fEmU" }); // the owner's first pick, seeded once
    expect(v.items[1]).toMatchObject({ kind: "video", youtubeId: "LSfqMq72Qjk", title: "Plan your week" });
    expect((await admin.POST(req("POST", { creator: "abouzeid", kind: "course", link: "https://x.com/c" }))).status).toBe(400);
    expect((await admin.POST(req("POST", { creator: "abouzeid", kind: "course", link: "javascript:alert(1)", title: "C" }))).status).toBe(400);
    expect((await admin.POST(req("POST", { creator: "abouzeid", kind: "channel", link: "https://www.youtube.com/@one" }))).status).toBe(200);
    const after = (await (await admin.POST(req("POST", { creator: "abouzeid", kind: "channel", link: "https://www.youtube.com/@two" }))).json()) as Items;
    const channels = after.items.filter((i) => i.kind === "channel");
    expect(channels).toHaveLength(1);
    expect(channels[0].url).toBe("https://www.youtube.com/@two");
    const del = (await (await admin.DELETE(req("DELETE", { id: channels[0].id }))).json()) as Items;
    expect(del.items.some((i) => i.kind === "channel")).toBe(false);
    // One featured video for the whole site: a new one replaces the old.
    await admin.POST(req("POST", { creator: "abouzeid", kind: "featured", link: "https://youtu.be/LSfqMq72Qjk" }));
    const feat = (await (await admin.POST(req("POST", { creator: "abdaal", kind: "featured", link: "https://www.youtube.com/watch?v=qALULLsNpbc" }))).json()) as Items;
    expect(feat.items.filter((i) => i.kind === "featured").map((i) => i.youtubeId)).toEqual(["qALULLsNpbc"]);
    // A deleted seed stays deleted.
    await admin.DELETE(req("DELETE", { id: "seed-7nmKtI7fEmU" }));
    cookie = student;
    const after2 = (await (await route.GET()).json()) as Items;
    expect(after2.items.some((i) => i.youtubeId === "7nmKtI7fEmU")).toBe(false);
  });
});
