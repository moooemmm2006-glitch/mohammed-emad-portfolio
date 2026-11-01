import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDb, resetDbForTests, schema } from "@/lib/db";
import { listVlogs } from "@/lib/site";
import { FIRST_VLOG, FIRST_VLOG_OLD_DESCRIPTION } from "@/lib/siteShared";
import { eq } from "drizzle-orm";

// The first vlog's old description said "in Germany" by mistake; it is corrected once, in place,
// but a description the admin wrote is left alone.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-vlog-"));
process.env.DATABASE_PATH = path.join(dir, "v.db");
afterAll(() => {
  resetDbForTests();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("first vlog description", () => {
  it("never mentions Germany and fixes the old wording", async () => {
    expect(FIRST_VLOG.description_ar).not.toContain("ألمانيا");
    await listVlogs(); // seeds
    const db = await getDb();
    await db.update(schema.vlogs).set({ descriptionAr: FIRST_VLOG_OLD_DESCRIPTION }).where(eq(schema.vlogs.youtubeId, FIRST_VLOG.youtubeId)).run();
    expect((await listVlogs())[0].description_ar).toBe(FIRST_VLOG.description_ar);
    await db.update(schema.vlogs).set({ descriptionAr: "وصف من الأدمن" }).where(eq(schema.vlogs.youtubeId, FIRST_VLOG.youtubeId)).run();
    expect((await listVlogs())[0].description_ar).toBe("وصف من الأدمن");
  });
});
