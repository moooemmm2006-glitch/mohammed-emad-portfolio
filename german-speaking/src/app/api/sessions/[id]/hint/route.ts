import { NextResponse } from "next/server";
import { getHint } from "@/lib/conversation";
import { jsonError } from "@/lib/api";
import { currentUser, ownSession, unauthorized } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!(await ownSession(id, user))) return jsonError(404, "not_found", "Session not found");
  try {
    return NextResponse.json(await getHint(id));
  } catch (err) {
    console.error("[hint] failed:", err);
    return jsonError(502, "hint_failed", err instanceof Error ? err.message : "Hint failed");
  }
}
