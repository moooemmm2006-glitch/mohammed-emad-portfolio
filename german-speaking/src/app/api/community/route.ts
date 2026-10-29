import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { presenceCutoff, publicRoom } from "@/lib/community/service";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const user = await currentUser(); if (!user) return unauthorized();
  const db = await getDb(); const now = Date.now();
  await db.insert(schema.communityPreferences).values({ userId: user.id, shareOnline: 0, lastSeenAt: now, updatedAt: now }).onConflictDoNothing();
  const [preferences, publicRooms, myMemberships] = await Promise.all([
    db.select().from(schema.communityPreferences).where(eq(schema.communityPreferences.userId, user.id)).get(),
    db.select().from(schema.studyRooms).where(and(eq(schema.studyRooms.status, "active"), eq(schema.studyRooms.visibility, "public"))).orderBy(desc(schema.studyRooms.createdAt)).limit(60).all(),
    db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.userId, user.id), eq(schema.studyRoomMembers.status, "active"))).all(),
  ]);
  await db.update(schema.communityPreferences).set({lastSeenAt:now,updatedAt:now}).where(eq(schema.communityPreferences.userId,user.id)).run();
  const mineIds = new Set(myMemberships.map((m) => m.roomId));
  const privateMine = myMemberships.length ? await db.select().from(schema.studyRooms).where(and(inArray(schema.studyRooms.id, [...mineIds]), eq(schema.studyRooms.visibility, "private"), eq(schema.studyRooms.status, "active"))).all() : [];
  const myRoomsRows = [...new Map([...publicRooms.filter((r) => mineIds.has(r.id)), ...privateMine].map((r) => [r.id, r])).values()];
  const roomIds = [...new Set([...publicRooms, ...myRoomsRows].map((r) => r.id))];
  const hosts = [...new Set([...publicRooms, ...myRoomsRows].map((r) => r.hostUserId))];
  const [members, hostRows] = roomIds.length ? await Promise.all([
    db.select().from(schema.studyRoomMembers).where(and(inArray(schema.studyRoomMembers.roomId, roomIds), eq(schema.studyRoomMembers.status, "active"), gte(schema.studyRoomMembers.lastSeenAt, presenceCutoff(now)))).all(),
    db.select({ id: schema.users.id, name: schema.users.name, username: schema.users.username, photo: schema.users.photo }).from(schema.users).where(inArray(schema.users.id, hosts)).all(),
  ]) : [[], []];
  const memberCounts = new Map<string, number>(); for (const m of members) memberCounts.set(m.roomId, (memberCounts.get(m.roomId) ?? 0) + 1);
  const hostMap = new Map(hostRows.map((h) => [h.id, h]));
  const toCard = (room: typeof publicRooms[number]) => publicRoom(room, hostMap.get(room.hostUserId), memberCounts.get(room.id) ?? 0);
  const visiblePresence = await db.select().from(schema.communityPreferences).where(and(eq(schema.communityPreferences.shareOnline, 1), gte(schema.communityPreferences.lastSeenAt, presenceCutoff(now)))).limit(80).all();
  const peopleIds = visiblePresence.map((p) => p.userId);
  const peopleRows = peopleIds.length ? await db.select({ id: schema.users.id, name: schema.users.name, username: schema.users.username, photo: schema.users.photo }).from(schema.users).where(inArray(schema.users.id, peopleIds)).all() : [];
  const publicMembers = members.filter((m) => publicRooms.some((room) => room.id === m.roomId));
  const publicRoomByMember = new Map(publicMembers.map((m) => [m.userId, publicRooms.find((room) => room.id === m.roomId)]));
  const onlinePeople = peopleRows.map((p) => { const r = publicRoomByMember.get(p.id); return { id: p.id, name: p.name || p.username || "Student", photo: p.photo, room: r ? { id: r.id, name: r.name, level: r.level } : null }; });
  const uniqueStudying = new Set(members.map((m) => m.userId));
  return NextResponse.json({
    preferences: { shareOnline: Boolean(preferences?.shareOnline) },
    stats: { online: onlinePeople.length, studying: uniqueStudying.size, rooms: new Set([...publicRooms, ...privateMine].map((r) => r.id)).size, publicAvailable: publicRooms.filter((r) => (memberCounts.get(r.id) ?? 0) < r.capacity).length },
    rooms: publicRooms.map(toCard), myRooms: myRoomsRows.map(toCard), onlinePeople,
  });
}
