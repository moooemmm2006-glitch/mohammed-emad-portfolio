import { and, eq } from "drizzle-orm";
import { getDb, schema } from "./db";

// Watched videos per user: last position (for "كمّل من مكان ما وقفت") and finished flag.

import type { VideoState } from "./videoShared";

export { percentOf, VIDEO_KEY, type VideoState } from "./videoShared";

export async function getVideoProgress(userId: string): Promise<VideoState[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.videoProgress).where(eq(schema.videoProgress.userId, userId)).all();
  return rows.map((r) => ({ key: r.key, position: r.position, duration: r.duration, watched: !!r.watched, updatedAt: r.updatedAt }));
}

/** Save the position; "watched" sticks once set (re-watching doesn't undo it unless set false explicitly). */
export async function saveVideoProgress(userId: string, key: string, p: { position?: number; duration?: number | null; watched?: boolean }, now = Date.now()) {
  const db = await getDb();
  const old = await db.select().from(schema.videoProgress).where(and(eq(schema.videoProgress.userId, userId), eq(schema.videoProgress.key, key))).get();
  const duration = p.duration && p.duration > 0 ? Math.round(p.duration) : (old?.duration ?? null);
  let position = Math.max(0, Math.round(p.position ?? old?.position ?? 0));
  if (duration) position = Math.min(position, duration);
  // Almost at the end counts as finished.
  const nearEnd = !!duration && position >= duration * 0.97;
  const watched = p.watched === undefined ? (old?.watched ?? 0) || (nearEnd ? 1 : 0) : p.watched ? 1 : 0;
  const row = { userId, key, position, duration, watched, updatedAt: now };
  await db
    .insert(schema.videoProgress)
    .values(row)
    .onConflictDoUpdate({ target: [schema.videoProgress.userId, schema.videoProgress.key], set: { position, duration, watched, updatedAt: now } })
    .run();
  return { key, position, duration, watched: !!watched, updatedAt: now };
}
