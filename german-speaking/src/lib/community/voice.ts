import { randomBytes } from "node:crypto";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// Voice in study rooms: audio only, browser to browser (WebRTC mesh). The server only keeps who is
// in the call and passes the connection offers/answers between them. With a mesh every participant
// sends their voice to each other one, so a call is limited to VOICE_MAX people.

export const VOICE_MAX = 10;
/** A participant who hasn't polled for this long has left (closed tab, lost connection). */
export const VOICE_TTL_MS = 20_000;
/** Offers/answers older than this are useless and get deleted. */
export const SIGNAL_TTL_MS = 60_000;
export const SIGNAL_MAX_LENGTH = 30_000;

export const newVoiceSid = () => randomBytes(12).toString("base64url");

/**
 * STUN finds each browser's public address; a TURN relay (optional, from env) helps when both sides
 * are behind strict networks (some mobile carriers). The TURN values reach the browser anyway.
 */
export function iceServers(env: Record<string, string | undefined> = process.env): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turn = (env.TURN_URLS ?? "").split(",").map((u) => u.trim()).filter((u) => /^turns?:/.test(u));
  if (turn.length && env.TURN_USERNAME && env.TURN_CREDENTIAL) servers.push({ urls: turn, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL });
  return servers;
}

/** Everyone in the room's call right now, with names for the list. */
export async function voicePeers(roomId: string, now = Date.now()) {
  const db = await getDb();
  const rows = await db.select().from(schema.studyRoomVoice).where(and(eq(schema.studyRoomVoice.roomId, roomId), gte(schema.studyRoomVoice.lastSeenAt, now - VOICE_TTL_MS))).all();
  if (!rows.length) return [];
  const users = await db.select({ id: schema.users.id, name: schema.users.name, username: schema.users.username, photo: schema.users.photo }).from(schema.users).where(inArray(schema.users.id, rows.map((r) => r.userId))).all();
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((r) => ({ sid: r.sid, userId: r.userId, muted: Boolean(r.muted), name: byId.get(r.userId)?.name || byId.get(r.userId)?.username || "Student", photo: byId.get(r.userId)?.photo ?? null }));
}

/** Take a user out of a room's call (leaving the room, being removed, the room ending). */
export async function leaveVoice(roomId: string, userId?: string) {
  const db = await getDb();
  await db.delete(schema.studyRoomVoice).where(userId ? and(eq(schema.studyRoomVoice.roomId, roomId), eq(schema.studyRoomVoice.userId, userId)) : eq(schema.studyRoomVoice.roomId, roomId)).run();
}

export async function pruneSignals(roomId: string, now = Date.now()) {
  const db = await getDb();
  await db.delete(schema.studyRoomSignals).where(and(eq(schema.studyRoomSignals.roomId, roomId), lt(schema.studyRoomSignals.createdAt, now - SIGNAL_TTL_MS))).run();
}
