import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { CREATORS, PRODUCTIVITY_SEED, type Creator, type ProductivityItem, type ProductivityKind } from "@/lib/productivityShared";

/** Each of the owner's picks only once. Something the admin deletes later doesn't come back. */
async function seedProductivity(now: number) {
  const db = await getDb();
  for (const [i, v] of PRODUCTIVITY_SEED.entries()) {
    if (await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, v.flag)).get()) continue;
    const taken = v.kind === "featured" && (await db.select().from(schema.productivityItems).where(eq(schema.productivityItems.kind, "featured")).get());
    if (!taken) await db.insert(schema.productivityItems).values({ id: `seed-${v.youtubeId}`, creator: v.creator, kind: v.kind, title: v.title, url: `https://www.youtube.com/watch?v=${v.youtubeId}`, youtubeId: v.youtubeId, createdAt: now + i }).onConflictDoNothing().run();
    await db.insert(schema.siteSettings).values({ key: v.flag, value: "1", updatedAt: now }).onConflictDoNothing().run();
  }
}

export async function listProductivity(now = Date.now()): Promise<ProductivityItem[]> {
  await seedProductivity(now);
  const db = await getDb();
  const rows = await db.select().from(schema.productivityItems).orderBy(asc(schema.productivityItems.createdAt)).all();
  // Rows of a creator no longer on the site are hidden (kept in the table, harmless).
  return rows.filter((r) => (CREATORS as readonly string[]).includes(r.creator)).map((r) => ({ id: r.id, creator: r.creator as Creator, kind: r.kind as ProductivityKind, title: r.title, url: r.url, youtubeId: r.youtubeId }));
}

/** Adds one item. A creator has one channel link, and the site one featured video: a new one replaces the old. */
export async function addProductivityItem(item: Omit<ProductivityItem, "id">, now = Date.now()) {
  const db = await getDb();
  if (item.kind === "channel" || item.kind === "featured") {
    const old = (await listProductivity()).filter((i) => i.kind === item.kind && (item.kind === "featured" || i.creator === item.creator));
    for (const o of old) await db.delete(schema.productivityItems).where(eq(schema.productivityItems.id, o.id)).run();
  }
  await db.insert(schema.productivityItems).values({ id: randomUUID(), ...item, createdAt: now }).run();
}

export async function deleteProductivityItem(id: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.delete(schema.productivityItems).where(eq(schema.productivityItems.id, id)).run();
  return r.rowsAffected > 0;
}
