import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { listVlogs } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "☕ استراحة": the owner's vlogs, newest first.
export async function GET() {
  if (!(await currentUser())) return unauthorized();
  return NextResponse.json({ vlogs: await listVlogs() });
}
