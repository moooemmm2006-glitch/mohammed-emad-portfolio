import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { sniffImage } from "./photo";
import { CLICK_PLACES, DEFAULT_CHANNEL_URL, FIRST_VLOG, type ClickPlace, type SiteLinks, type Vlog } from "./siteShared";

// Server only. The owner's channel, explainer video, tutorials playlist and channel photo (admin
// settings), the vlogs of "☕ استراحة" and the channel click counter.

const KEYS = { channelUrl: "channel_url", explainerId: "explainer_id", playlistId: "playlist_id", channelPhoto: "channel_photo" } as const;
const VLOGS_SEEDED = "vlogs_seeded";

/** Up to ~150 KB for the channel photo (it is resized to 160×160 in the browser before upload). */
export const CHANNEL_PHOTO_MAX = 150_000;

export async function getSiteLinks(): Promise<SiteLinks> {
  const db = await getDb();
  const rows = await db.select().from(schema.siteSettings).where(inArray(schema.siteSettings.key, Object.values(KEYS))).all();
  const got = new Map(rows.map((r) => [r.key, r.value]));
  // No row = never set → the channel uses its default; an empty value = removed by the admin.
  const val = (k: string, fallback: string | null = null) => (got.has(k) ? got.get(k) || null : fallback);
  return {
    channelUrl: val(KEYS.channelUrl, DEFAULT_CHANNEL_URL),
    explainerId: val(KEYS.explainerId),
    playlistId: val(KEYS.playlistId),
    channelPhoto: val(KEYS.channelPhoto),
  };
}

/** The links for every page; never fails (a broken database just means "nothing extra to show"). */
export async function siteLinksSafe(): Promise<SiteLinks> {
  try {
    return await getSiteLinks();
  } catch {
    return { channelUrl: DEFAULT_CHANNEL_URL, explainerId: null, playlistId: null, channelPhoto: null };
  }
}

/** Save already validated values; null removes one (the place on the site disappears). */
export async function saveSiteLinks(patch: Partial<SiteLinks>, now = Date.now()) {
  const db = await getDb();
  for (const [field, key] of Object.entries(KEYS) as [keyof SiteLinks, string][]) {
    if (!(field in patch)) continue;
    const value = patch[field] ?? "";
    await db
      .insert(schema.siteSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value, updatedAt: now } })
      .run();
  }
}

/** A small channel photo as a data URL (WebP/PNG/JPEG only, checked by its bytes), or null. */
export function checkChannelPhoto(dataUrl: string): string | null {
  const m = dataUrl.match(/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || dataUrl.length > CHANNEL_PHOTO_MAX) return null;
  const bytes = Uint8Array.from(Buffer.from(m[2], "base64"));
  return sniffImage(bytes) === `image/${m[1]}` ? dataUrl : null;
}

// ---------- vlogs ----------

async function seedVlogs(now: number) {
  const db = await getDb();
  const flag = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, VLOGS_SEEDED)).get();
  if (flag) return;
  // Only once: a vlog the admin deletes later doesn't come back.
  await db.insert(schema.vlogs).values({ youtubeId: FIRST_VLOG.youtubeId, title: FIRST_VLOG.title, descriptionAr: FIRST_VLOG.description_ar, addedAt: now }).onConflictDoNothing().run();
  await db.insert(schema.siteSettings).values({ key: VLOGS_SEEDED, value: "1", updatedAt: now }).onConflictDoNothing().run();
}

export async function listVlogs(now = Date.now()): Promise<Vlog[]> {
  await seedVlogs(now);
  const db = await getDb();
  const rows = await db.select().from(schema.vlogs).orderBy(desc(schema.vlogs.addedAt)).all();
  return rows.map((r) => ({ youtubeId: r.youtubeId, title: r.title, description_ar: r.descriptionAr, addedAt: r.addedAt }));
}

export async function addVlog(v: { youtubeId: string; title: string; description_ar: string }, now = Date.now()) {
  await seedVlogs(now);
  const db = await getDb();
  await db
    .insert(schema.vlogs)
    .values({ youtubeId: v.youtubeId, title: v.title, descriptionAr: v.description_ar, addedAt: now })
    .onConflictDoUpdate({ target: schema.vlogs.youtubeId, set: { title: v.title, descriptionAr: v.description_ar } })
    .run();
}

export async function deleteVlog(youtubeId: string): Promise<boolean> {
  await seedVlogs(Date.now());
  const db = await getDb();
  return (await db.delete(schema.vlogs).where(eq(schema.vlogs.youtubeId, youtubeId)).run()).rowsAffected > 0;
}

// ---------- channel clicks ----------

export async function recordChannelClick(place: ClickPlace) {
  const db = await getDb();
  await db
    .insert(schema.channelClicks)
    .values({ place, count: 1 })
    .onConflictDoUpdate({ target: schema.channelClicks.place, set: { count: sql`${schema.channelClicks.count} + 1` } })
    .run();
}

export async function channelClicks(): Promise<{ total: number; byPlace: Record<ClickPlace, number> }> {
  const db = await getDb();
  const rows = await db.select().from(schema.channelClicks).all();
  const byPlace = Object.fromEntries(CLICK_PLACES.map((p) => [p, rows.find((r) => r.place === p)?.count ?? 0])) as Record<ClickPlace, number>;
  return { total: Object.values(byPlace).reduce((a, b) => a + b, 0), byPlace };
}

/** What YouTube says about a video (title, channel); null when YouTube can't be reached. */
export async function youtubeOEmbed(id: string): Promise<{ title: string; author: string; authorUrl: string } | "missing" | null> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(4000) });
    if (r.status === 404 || r.status === 400 || r.status === 401) return "missing";
    if (!r.ok) return null;
    const d = (await r.json()) as { title?: string; author_name?: string; author_url?: string };
    return d.title ? { title: d.title, author: d.author_name ?? "", authorUrl: d.author_url ?? "" } : null;
  } catch {
    return null;
  }
}
