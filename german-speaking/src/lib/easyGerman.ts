import { and, eq } from "drizzle-orm";
import { z } from "zod";
import file from "../../data/easy-german-videos.json";
import { getDb, schema } from "./db";
import { LEVELS, type Level } from "./levels";
import { levelOfTopic } from "./bookLevels";
import { egKey, YOUTUBE_ID, type EasyGermanVideo } from "./easyGermanShared";

// Server only. Real Easy German videos (YouTube) per book topic, from data/easy-german-videos.json
// (every ID checked against YouTube by the owner), merged at runtime with the admin's additions/removals.

const VideoSchema = z.object({
  youtubeId: z.string().regex(YOUTUBE_ID),
  title: z.string().min(1),
  channel: z.string().min(1),
  url: z.url(),
});
const FileSchema = z.object({
  source: z.string(),
  topics: z.array(
    z.object({
      topic: z.number().int().min(1).max(100),
      level: z.enum(LEVELS),
      title_de: z.string(),
      title_ar: z.string(),
      videos: z.array(VideoSchema).min(1).max(3),
    }),
  ),
});
export type EasyGermanFile = z.infer<typeof FileSchema>;

/** Checks the file: valid shape, topics unique and in their book level, url matches the ID. */
export function parseEasyGermanFile(data: unknown): EasyGermanFile {
  const f = FileSchema.parse(data);
  const seen = new Set<number>();
  for (const t of f.topics) {
    if (seen.has(t.topic)) throw new Error(`Easy German videos: topic ${t.topic} twice`);
    seen.add(t.topic);
    if (levelOfTopic(t.topic) !== t.level) throw new Error(`Easy German videos: topic ${t.topic} is not ${t.level}`);
    for (const v of t.videos) if (new URL(v.url).searchParams.get("v") !== v.youtubeId) throw new Error(`Easy German videos: url of ${v.youtubeId} doesn't match`);
  }
  return f;
}

let cached: Map<number, EasyGermanVideo[]> | null = null;
function fileMap(): Map<number, EasyGermanVideo[]> {
  cached ??= new Map(parseEasyGermanFile(file).topics.map((t) => [t.topic, t.videos]));
  return cached;
}

/** The videos of a topic from the JSON file only ([] when none was chosen). */
export function getEasyGermanVideos(topicNumber: number): EasyGermanVideo[] {
  return fileMap().get(topicNumber) ?? [];
}

export const easyGermanTopicNumbers = () => [...fileMap().keys()];

// ---------- admin changes (database) merged with the file ----------

type AdminRow = typeof schema.topicVideos.$inferSelect;

async function adminRows(topic?: number): Promise<AdminRow[]> {
  const db = await getDb();
  const q = db.select().from(schema.topicVideos);
  return topic === undefined ? q.all() : q.where(eq(schema.topicVideos.topic, topic)).all();
}

function merge(fileVideos: EasyGermanVideo[], rows: AdminRow[]): EasyGermanVideo[] {
  const hidden = new Set(rows.filter((r) => r.action === "hide").map((r) => r.youtubeId));
  const added = rows
    .filter((r) => r.action === "add")
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => ({ youtubeId: r.youtubeId, title: r.title, channel: r.channel, url: `https://www.youtube.com/watch?v=${r.youtubeId}`, added: true }));
  const out = fileVideos.filter((v) => !hidden.has(v.youtubeId));
  for (const a of added) if (!out.some((v) => v.youtubeId === a.youtubeId)) out.push(a);
  return out;
}

/** A topic's videos: the file's, minus the ones the admin removed, plus the ones the admin added. */
export async function topicVideos(topicNumber: number): Promise<EasyGermanVideo[]> {
  return merge(getEasyGermanVideos(topicNumber), await adminRows(topicNumber));
}

/** All topics' videos (merged) for the given topic numbers. */
export async function topicVideosMap(topics: number[]): Promise<Map<number, EasyGermanVideo[]>> {
  const rows = await adminRows();
  return new Map(topics.map((n) => [n, merge(getEasyGermanVideos(n), rows.filter((r) => r.topic === n))]));
}

/** Topics the admin removed videos from (to show and restore them). */
export async function hiddenVideos(topicNumber: number): Promise<EasyGermanVideo[]> {
  const ids = new Set((await adminRows(topicNumber)).filter((r) => r.action === "hide").map((r) => r.youtubeId));
  return getEasyGermanVideos(topicNumber).filter((v) => ids.has(v.youtubeId));
}

export async function adminAddVideo(topic: number, youtubeId: string, title: string, channel = "Easy German", now = Date.now()) {
  const db = await getDb();
  const inFile = getEasyGermanVideos(topic).some((v) => v.youtubeId === youtubeId);
  // A file video that was removed comes back by dropping its "hide" row.
  if (inFile) {
    await db.delete(schema.topicVideos).where(and(eq(schema.topicVideos.topic, topic), eq(schema.topicVideos.youtubeId, youtubeId))).run();
    return;
  }
  await db
    .insert(schema.topicVideos)
    .values({ topic, youtubeId, action: "add", title, channel, createdAt: now })
    .onConflictDoUpdate({ target: [schema.topicVideos.topic, schema.topicVideos.youtubeId], set: { action: "add", title, channel } })
    .run();
}

export async function adminRemoveVideo(topic: number, youtubeId: string, now = Date.now()) {
  const db = await getDb();
  const where = and(eq(schema.topicVideos.topic, topic), eq(schema.topicVideos.youtubeId, youtubeId));
  if (getEasyGermanVideos(topic).some((v) => v.youtubeId === youtubeId)) {
    await db
      .insert(schema.topicVideos)
      .values({ topic, youtubeId, action: "hide", title: "", channel: "", createdAt: now })
      .onConflictDoUpdate({ target: [schema.topicVideos.topic, schema.topicVideos.youtubeId], set: { action: "hide" } })
      .run();
  } else await db.delete(schema.topicVideos).where(where).run();
}

/** Watched / total Easy German videos per level for one learner. */
export async function easyGermanProgress(watchedKeys: Set<string>, topicsByLevel: Record<Level, number[]>) {
  const all = Object.values(topicsByLevel).flat();
  const map = await topicVideosMap(all);
  const out = {} as Record<Level, { watched: number; total: number }>;
  for (const level of LEVELS) {
    const vids = topicsByLevel[level].flatMap((n) => map.get(n) ?? []);
    out[level] = { watched: vids.filter((v) => watchedKeys.has(egKey(v.youtubeId))).length, total: vids.length };
  }
  return out;
}
