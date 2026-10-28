import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getVideoThema } from "@/lib/videoThema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DW Video-Thema (B2): fetched on the server (cached 12 h), never from the browser.
export async function GET() {
  if (!(await currentUser())) return unauthorized();
  return NextResponse.json(await getVideoThema());
}
