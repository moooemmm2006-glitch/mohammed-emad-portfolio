import { NextResponse } from "next/server";
import { updateSession } from "@/lib/db/repo";
import { currentUser, ownSession, unauthorized } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Also called with navigator.sendBeacon when the tab closes mid-conversation.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const s = await ownSession(id, user);
  if (!s) return jsonError(404, "not_found", "Session not found");
  if (s.status === "active") await updateSession(id, { status: "ended", endedAt: s.lastActiveAt });
  return NextResponse.json({ ok: true });
}
