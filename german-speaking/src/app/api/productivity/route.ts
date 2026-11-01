import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { listProductivity } from "@/lib/productivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 🎯 The productivity section (videos, courses, channel links), oldest first.
export async function GET() {
  if (!(await currentUser())) return unauthorized();
  return NextResponse.json({ items: await listProductivity() });
}
