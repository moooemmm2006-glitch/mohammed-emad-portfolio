import { createHash } from "node:crypto";
import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const COMMUNITY_PRESENCE_TTL_MS = 55_000;
export const COMMUNITY_MAX_CAPACITY = 40;
export const COMMUNITY_MAX_MESSAGE_LENGTH = 1000;
export const hashInviteToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const presenceCutoff = (now = Date.now()) => now - COMMUNITY_PRESENCE_TTL_MS;

export async function findRoomMember(roomId: string, userId: string) {
  const db = await getDb();
  return db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId, roomId), eq(schema.studyRoomMembers.userId, userId))).get();
}

export async function roomMemberCount(roomId: string, now = Date.now()) {
  const db = await getDb();
  const members = await db.select({ userId: schema.studyRoomMembers.userId }).from(schema.studyRoomMembers)
    .where(and(eq(schema.studyRoomMembers.roomId, roomId), eq(schema.studyRoomMembers.status, "active"), gte(schema.studyRoomMembers.lastSeenAt, presenceCutoff(now)))).all();
  return members.length;
}

export async function liveRoomMembers(roomId: string, now = Date.now()) {
  const db = await getDb();
  const members = await db.select().from(schema.studyRoomMembers).where(and(
    eq(schema.studyRoomMembers.roomId, roomId), eq(schema.studyRoomMembers.status, "active"), gte(schema.studyRoomMembers.lastSeenAt, presenceCutoff(now)),
  )).all();
  const ids = [...new Set(members.map((m) => m.userId))];
  if (!ids.length) return [];
  const users = await db.select({ id: schema.users.id, name: schema.users.name, username: schema.users.username, photo: schema.users.photo })
    .from(schema.users).where(inArray(schema.users.id, ids)).all();
  const byId = new Map(users.map((u) => [u.id, u]));
  return members.map((m) => ({
    userId: m.userId, role: m.role, joinedAt: m.joinedAt, lastSeenAt: m.lastSeenAt, handRaisedAt: m.handRaisedAt,
    name: byId.get(m.userId)?.name || byId.get(m.userId)?.username || "Student", photo: byId.get(m.userId)?.photo ?? null,
  })).sort((a, b) => (a.handRaisedAt ? 0 : 1) - (b.handRaisedAt ? 0 : 1) || (a.handRaisedAt ?? a.joinedAt) - (b.handRaisedAt ?? b.joinedAt));
}

export function publicRoom(room: typeof schema.studyRooms.$inferSelect, host?: { name: string | null; username: string | null; photo: string | null }, participants = 0) {
  return {
    id: room.id, name: room.name, description: room.description, visibility: room.visibility, capacity: room.capacity,
    level: room.level, mode: room.mode, goal: room.goal, approvalRequired: Boolean(room.approvalRequired), status: room.status,
    timerStatus: room.timerStatus, timerPhase: room.timerPhase, timerEndsAt: room.timerEndsAt,
    host: { name: host?.name || host?.username || "Student", photo: host?.photo ?? null }, participants,
    createdAt: room.createdAt,
  };
}
