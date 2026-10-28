import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { focusStats } from "@/lib/focus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "💰 خزنتي": total, today, week, streak, last 7 days, badges.
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const tz = Number(new URL(req.url).searchParams.get("tz") ?? 0);
  return NextResponse.json(await focusStats(user.id, Number.isFinite(tz) ? Math.max(-900, Math.min(900, Math.round(tz))) : 0));
}
