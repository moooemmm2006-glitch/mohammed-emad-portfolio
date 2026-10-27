import { NextResponse } from "next/server";
import { computeStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tz = Number(new URL(req.url).searchParams.get("tz") ?? 0);
  return NextResponse.json(await computeStats(Number.isFinite(tz) ? tz : 0));
}
