import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST() {
  const user = await currentUser(); if (!user) return unauthorized();
  const db = await getDb(); const now = Date.now();
  await db.insert(schema.communityPreferences).values({ userId: user.id, shareOnline: 0, lastSeenAt: now, updatedAt: now }).onConflictDoUpdate({ target: schema.communityPreferences.userId, set: { lastSeenAt: now, updatedAt: now } });
  await db.update(schema.studyRoomMembers).set({ lastSeenAt: now }).where(and(eq(schema.studyRoomMembers.userId, user.id), eq(schema.studyRoomMembers.status, "active")));
  return NextResponse.json({ ok: true, at: now });
}
