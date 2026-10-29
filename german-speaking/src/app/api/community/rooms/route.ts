import { randomBytes, randomUUID } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { hashInviteToken } from "@/lib/community/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CreateRoom = z.object({
  name: z.string().trim().min(3).max(70), description: z.string().trim().max(300).default(""), visibility: z.enum(["public", "private"]),
  capacity: z.number().int().min(2).max(40), level: z.enum(["general", "A1", "A2", "B1", "B2"]), mode: z.enum(["silent", "focus", "practice", "grammar", "free"]),
  goal: z.string().trim().max(160).default(""), durationMinutes: z.number().int().min(5).max(180).default(25), breakMinutes: z.number().int().min(1).max(30).default(5), approvalRequired: z.boolean().default(false),
});
export async function POST(req: Request) {
  const user = await currentUser(); if (!user) return unauthorized();
  const parsed = CreateRoom.safeParse(await readJson(req)); if (!parsed.success) return jsonError(400, "invalid_body", "Check the room details and try again.");
  const db = await getDb(); const { data } = parsed; const now = Date.now();
  const hosted = await db.select({ n: count() }).from(schema.studyRooms).where(and(eq(schema.studyRooms.hostUserId, user.id), eq(schema.studyRooms.status, "active"))).get();
  if ((hosted?.n ?? 0) >= 5) return jsonError(429, "room_limit", "You can host up to five active rooms.");
  const id = randomUUID(); const inviteToken = data.visibility === "private" ? randomBytes(32).toString("base64url") : null;
  await db.transaction(async (tx) => {
    await tx.insert(schema.studyRooms).values({
      id, hostUserId: user.id, name: data.name, description: data.description, visibility: data.visibility, capacity: data.capacity,
      level: data.level, mode: data.mode, goal: data.goal, approvalRequired: Number(data.approvalRequired),
      inviteTokenHash: inviteToken ? hashInviteToken(inviteToken) : null, status: "active", timerStatus: "idle", timerPhase: "focus",
      timerDurationMinutes: data.durationMinutes, breakDurationMinutes: data.breakMinutes, timerElapsedMs: 0, createdAt: now, updatedAt: now,
    }).run();
    await tx.insert(schema.studyRoomMembers).values({ roomId: id, userId: user.id, role: "host", status: "active", joinedAt: now, lastSeenAt: now }).run();
  });
  return NextResponse.json({ id, inviteToken, name: data.name }, { status: 201 });
}
