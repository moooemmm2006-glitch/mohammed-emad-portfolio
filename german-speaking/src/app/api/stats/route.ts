import { NextResponse } from "next/server";
import { computeStats } from "@/lib/stats";
import { currentUser, unauthorized } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const tz = Number(new URL(req.url).searchParams.get("tz") ?? 0);
  return NextResponse.json(await computeStats(user.id, Number.isFinite(tz) ? tz : 0));
}
