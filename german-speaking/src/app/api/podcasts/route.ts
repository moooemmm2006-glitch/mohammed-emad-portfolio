import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { isLevel } from "@/lib/levels";
import { listPodcasts } from "@/lib/podcasts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await currentUser())) return unauthorized();
  const level = new URL(req.url).searchParams.get("level")?.toUpperCase();
  if (level && (!isLevel(level) || (level !== "B1" && level !== "B2"))) return NextResponse.json({ error: { code: "invalid_level" } }, { status: 400 });
  return NextResponse.json({ podcasts: await listPodcasts(level as "B1" | "B2" | undefined) });
}
