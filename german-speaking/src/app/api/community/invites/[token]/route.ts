import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { hashInviteToken, publicRoom, roomMemberCount } from "@/lib/community/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const user = await currentUser(); if (!user) return unauthorized();
  const token = (await params).token;
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return jsonError(404, "not_found", "Invitation not found.");
  const db = await getDb(); const room = await db.select().from(schema.studyRooms).where(and(eq(schema.studyRooms.inviteTokenHash, hashInviteToken(token)), eq(schema.studyRooms.visibility, "private"), eq(schema.studyRooms.status, "active"))).get();
  if (!room) return jsonError(404, "not_found", "This invitation has expired or was revoked.");
  const host = await db.select({ name: schema.users.name, username: schema.users.username, photo: schema.users.photo }).from(schema.users).where(eq(schema.users.id, room.hostUserId)).get();
  return NextResponse.json({ room: publicRoom(room, host, await roomMemberCount(room.id)), inviteToken: token });
}
