import { and, asc, count, eq, gt, gte, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/auth/session";
import type { UserRow } from "@/lib/auth/users";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { iceServers, newVoiceSid, pruneSignals, SIGNAL_MAX_LENGTH, VOICE_MAX, VOICE_TTL_MS, voicePeers } from "@/lib/community/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Voice call of a study room (audio only). Only active members of an active room can take part.
// GET  ?sid=…&after=… → who is in the call + offers/answers addressed to me (also my heartbeat)
// POST join | leave | mute | signal

type Ctx = { params: Promise<{ id: string }> };

/** The user and database, or the error response (not logged in, not an active member of an active room). */
async function access(id: string): Promise<Response | { user: UserRow; db: Awaited<ReturnType<typeof getDb>> }> {
  const user = await currentUser();
  if (!user) return unauthorized();
  const db = await getDb();
  const room = await db.select().from(schema.studyRooms).where(eq(schema.studyRooms.id, id)).get();
  const member = await db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId, id), eq(schema.studyRoomMembers.userId, user.id))).get();
  if (!room || room.status !== "active" || member?.status !== "active") return jsonError(404, "not_found", "Room not found.");
  return { user, db };
}

/** My row in the call, if `sid` is my current one. A late heartbeat with the same id simply continues. */
async function mine(db: Awaited<ReturnType<typeof getDb>>, roomId: string, userId: string, sid: string) {
  const row = await db.select().from(schema.studyRoomVoice).where(and(eq(schema.studyRoomVoice.roomId, roomId), eq(schema.studyRoomVoice.userId, userId))).get();
  return row && row.sid === sid ? row : null;
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const a = await access(id);
  if (a instanceof Response) return a;
  const { user, db } = a;
  const url = new URL(req.url);
  const sid = url.searchParams.get("sid") ?? "";
  const rawAfter = url.searchParams.get("after");
  const after = rawAfter && /^\d+$/.test(rawAfter) ? Number(rawAfter) : 0;
  const now = Date.now();
  if (!(await mine(db, id, user.id, sid))) return jsonError(409, "not_in_voice", "Join the voice call first.");
  await db.update(schema.studyRoomVoice).set({ lastSeenAt: now }).where(and(eq(schema.studyRoomVoice.roomId, id), eq(schema.studyRoomVoice.userId, user.id))).run();
  // Being in the call also counts as being in the room.
  await db.update(schema.studyRoomMembers).set({ lastSeenAt: now }).where(and(eq(schema.studyRoomMembers.roomId, id), eq(schema.studyRoomMembers.userId, user.id))).run();
  await pruneSignals(id, now);
  const signals = await db
    .select({ id: schema.studyRoomSignals.id, fromSid: schema.studyRoomSignals.fromSid, kind: schema.studyRoomSignals.kind, payload: schema.studyRoomSignals.payload })
    .from(schema.studyRoomSignals)
    .where(and(eq(schema.studyRoomSignals.roomId, id), eq(schema.studyRoomSignals.toSid, sid), gt(schema.studyRoomSignals.id, after)))
    .orderBy(asc(schema.studyRoomSignals.id))
    .limit(50)
    .all();
  return NextResponse.json({ peers: await voicePeers(id, now), signals, next: signals.at(-1)?.id ?? after, max: VOICE_MAX });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("join") }),
  z.object({ action: z.literal("leave"), sid: z.string().max(40) }),
  z.object({ action: z.literal("mute"), sid: z.string().max(40), muted: z.boolean() }),
  z.object({ action: z.literal("signal"), sid: z.string().max(40), to: z.string().max(40), kind: z.enum(["offer", "answer"]), payload: z.string().min(1).max(SIGNAL_MAX_LENGTH) }),
]);

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await readJson(req));
  // Leaving must also work after being removed from the room, so it doesn't need room access.
  if (parsed.success && parsed.data.action === "leave") {
    const user = await currentUser();
    if (!user) return unauthorized();
    const db = await getDb();
    await db.delete(schema.studyRoomVoice).where(and(eq(schema.studyRoomVoice.roomId, id), eq(schema.studyRoomVoice.userId, user.id), eq(schema.studyRoomVoice.sid, parsed.data.sid))).run();
    return NextResponse.json({ ok: true });
  }
  const a = await access(id);
  if (a instanceof Response) return a;
  if (!parsed.success) return jsonError(400, "invalid_body", "Invalid voice action.");
  const { user, db } = a;
  const now = Date.now();
  const body = parsed.data;

  if (body.action === "join") {
    const others = await db
      .select({ n: count() })
      .from(schema.studyRoomVoice)
      .where(and(eq(schema.studyRoomVoice.roomId, id), ne(schema.studyRoomVoice.userId, user.id), gte(schema.studyRoomVoice.lastSeenAt, now - VOICE_TTL_MS)))
      .get();
    if ((others?.n ?? 0) >= VOICE_MAX) return jsonError(409, "voice_full", `The voice call is full (${VOICE_MAX} people).`);
    const sid = newVoiceSid();
    await db
      .insert(schema.studyRoomVoice)
      .values({ roomId: id, userId: user.id, sid, muted: 0, joinedAt: now, lastSeenAt: now })
      .onConflictDoUpdate({ target: [schema.studyRoomVoice.roomId, schema.studyRoomVoice.userId], set: { sid, muted: 0, joinedAt: now, lastSeenAt: now } })
      .run();
    return NextResponse.json({ sid, iceServers: iceServers(), max: VOICE_MAX });
  }

  if (!(await mine(db, id, user.id, body.sid))) return jsonError(409, "not_in_voice", "Join the voice call first.");

  if (body.action === "mute") {
    await db.update(schema.studyRoomVoice).set({ muted: body.muted ? 1 : 0, lastSeenAt: now }).where(and(eq(schema.studyRoomVoice.roomId, id), eq(schema.studyRoomVoice.userId, user.id))).run();
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "signal") return jsonError(400, "invalid_action", "Invalid voice action.");
  // signal: only to someone who is in this call right now
  const target = await db.select().from(schema.studyRoomVoice).where(and(eq(schema.studyRoomVoice.roomId, id), eq(schema.studyRoomVoice.sid, body.to), gte(schema.studyRoomVoice.lastSeenAt, now - VOICE_TTL_MS))).get();
  if (!target || target.userId === user.id) return jsonError(404, "peer_gone", "That participant left the call.");
  const recent = await db
    .select({ n: count() })
    .from(schema.studyRoomSignals)
    .where(and(eq(schema.studyRoomSignals.roomId, id), eq(schema.studyRoomSignals.fromSid, body.sid), gte(schema.studyRoomSignals.createdAt, now - 60_000)))
    .get();
  if ((recent?.n ?? 0) >= 120) return jsonError(429, "slow_down", "Too many connection attempts.");
  await db.insert(schema.studyRoomSignals).values({ roomId: id, fromSid: body.sid, toSid: body.to, kind: body.kind, payload: body.payload, createdAt: now }).run();
  return NextResponse.json({ ok: true }, { status: 201 });
}
