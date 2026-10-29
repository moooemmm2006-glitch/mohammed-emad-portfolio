import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const Body = z.object({ shareOnline: z.boolean() });
export async function PUT(req: Request) {
  const user = await currentUser(); if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req)); if (!parsed.success) return jsonError(400, "invalid_body", "Invalid presence preference");
  const db = await getDb(); const now = Date.now();
  await db.insert(schema.communityPreferences).values({ userId: user.id, shareOnline: Number(parsed.data.shareOnline), lastSeenAt: now, updatedAt: now }).onConflictDoUpdate({
    target: schema.communityPreferences.userId, set: { shareOnline: Number(parsed.data.shareOnline), lastSeenAt: now, updatedAt: now },
  });
  return NextResponse.json({ shareOnline: parsed.data.shareOnline });
}
