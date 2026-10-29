import { eq } from "drizzle-orm";
import { podcasts as podcastFile } from "../../data/podcasts";
import { getDb, schema } from "./db";
import type { PodcastItem } from "./podcastShared";

type PodcastRow = typeof schema.podcastItems.$inferSelect;

const fileItems = (): PodcastItem[] => podcastFile.map((p) => ({ ...p, id: `video:${p.youtubeId}` }));
const sourceId = (p: Pick<PodcastItem, "youtubeId" | "playlistId">) => p.youtubeId ? `video:${p.youtubeId}` : `playlist:${p.playlistId}`;

function fromRow(row: PodcastRow): PodcastItem | null {
  try {
    const levels = JSON.parse(row.levels) as unknown;
    if (!Array.isArray(levels) || !levels.every((l) => l === "B1" || l === "B2")) return null;
    if ((!row.youtubeId && !row.playlistId) || (row.youtubeId && row.playlistId)) return null;
    return {
      id: row.id,
      ...(row.youtubeId ? { youtubeId: row.youtubeId } : {}),
      ...(row.playlistId ? { playlistId: row.playlistId } : {}),
      title: row.title,
      channel: row.channel,
      levels,
      addedAt: row.addedAt,
      added: true,
    };
  } catch {
    return null;
  }
}

/** Dynamic podcast items first (newest first), followed by the verified file entries. */
export async function listPodcasts(level?: "B1" | "B2"): Promise<PodcastItem[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.podcastItems).all();
  const dynamic = rows.map(fromRow).filter((x): x is PodcastItem => !!x).sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
  const seen = new Set(dynamic.map(sourceId));
  const merged = [...dynamic, ...fileItems().filter((p) => !seen.has(sourceId(p)))];
  return level ? merged.filter((p) => p.levels.includes(level)) : merged;
}

export async function addPodcast(p: Omit<PodcastItem, "id" | "added" | "addedAt">, now = Date.now()): Promise<void> {
  const db = await getDb();
  const id = sourceId(p);
  const staticItem = fileItems().find((x) => sourceId(x) === id);
  if (staticItem) return;
  await db.insert(schema.podcastItems).values({
    id,
    youtubeId: p.youtubeId ?? null,
    playlistId: p.playlistId ?? null,
    title: p.title,
    channel: p.channel,
    levels: JSON.stringify([...new Set(p.levels)]),
    addedAt: now,
  }).onConflictDoUpdate({
    target: schema.podcastItems.id,
    set: { title: p.title, channel: p.channel, levels: JSON.stringify([...new Set(p.levels)]), addedAt: now },
  }).run();
}

export async function removePodcast(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.delete(schema.podcastItems).where(eq(schema.podcastItems.id, id)).run();
  return Number(result.rowsAffected ?? 0) > 0;
}
