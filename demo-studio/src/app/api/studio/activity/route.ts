import { NextResponse } from "next/server";
import { recentActivity } from "@/lib/repo";
import { requireStudio } from "@/lib/session";

export async function GET(req: Request) {
  const denied = await requireStudio();
  if (denied) return denied;
  const since = Number(new URL(req.url).searchParams.get("since")) || Date.now() - 60_000;
  return NextResponse.json({ items: await recentActivity(since) });
}
