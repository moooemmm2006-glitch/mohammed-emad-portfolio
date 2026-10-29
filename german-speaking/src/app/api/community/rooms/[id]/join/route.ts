import { and, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { COMMUNITY_PRESENCE_TTL_MS, hashInviteToken } from "@/lib/community/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const JoinBody = z.object({ inviteToken: z.string().max(100).optional() });
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return unauthorized();
  const { id } = await params; const parsed = JoinBody.safeParse(await readJson(req)); if (!parsed.success) return jsonError(400, "invalid_body", "Invalid invitation.");
  const db = await getDb(); const room = await db.select().from(schema.studyRooms).where(eq(schema.studyRooms.id, id)).get();
  if (!room || room.status !== "active") return jsonError(404, "not_found", "This room is no longer available.");
  const inviteOk = room.visibility === "private" && parsed.data.inviteToken ? room.inviteTokenHash === hashInviteToken(parsed.data.inviteToken) : false;
  if (room.visibility === "private" && !inviteOk) return jsonError(404, "not_found", "This private room requires a valid invitation.");
  const now = Date.now();
  try {
    const status = await db.transaction(async (tx) => {
      const existing = await tx.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId, id), eq(schema.studyRoomMembers.userId, user.id))).get();
      if (existing?.status === "active" && existing.lastSeenAt >= now - COMMUNITY_PRESENCE_TTL_MS) { await tx.update(schema.studyRoomMembers).set({ lastSeenAt: now }).where(and(eq(schema.studyRoomMembers.roomId, id), eq(schema.studyRoomMembers.userId, user.id))).run(); return "active"; }
      if (existing?.status === "pending") return "pending";
      if (room.approvalRequired && user.id !== room.hostUserId) {
        await tx.insert(schema.studyRoomMembers).values({ roomId: id, userId: user.id, role: "member", status: "pending", joinedAt: now, lastSeenAt: now }).onConflictDoUpdate({ target: [schema.studyRoomMembers.roomId, schema.studyRoomMembers.userId], set: { status: "pending", joinedAt: now, lastSeenAt: now } }).run();
        return "pending";
      }
      const current = await tx.select({ userId: schema.studyRoomMembers.userId }).from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId, id), eq(schema.studyRoomMembers.status, "active"), gte(schema.studyRoomMembers.lastSeenAt, now - COMMUNITY_PRESENCE_TTL_MS))).all();
      if (current.length >= room.capacity) return "full";
      await tx.insert(schema.studyRoomMembers).values({ roomId: id, userId: user.id, role: "member", status: "active", joinedAt: now, lastSeenAt: now }).onConflictDoUpdate({ target: [schema.studyRoomMembers.roomId, schema.studyRoomMembers.userId], set: { status: "active", joinedAt: now, lastSeenAt: now, handRaisedAt: null } }).run();
      return "active";
    });
    if (status === "full") return jsonError(409, "room_full", "This room has reached its participant limit.");
    return NextResponse.json({ status }, { status: status === "pending" ? 202 : 200 });
  } catch (error) {
    if (/busy|locked|transaction/i.test(String(error))) return jsonError(409, "room_busy", "The room changed while you were joining. Please try again.");
    throw error;
  }
}
