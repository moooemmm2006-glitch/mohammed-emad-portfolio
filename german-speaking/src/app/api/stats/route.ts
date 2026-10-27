import { NextResponse } from "next/server";
import { computeStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const tz = Number(new URL(req.url).searchParams.get("tz") ?? 0);
  return NextResponse.json(computeStats(Number.isFinite(tz) ? tz : 0));
}
