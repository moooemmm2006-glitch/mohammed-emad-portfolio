import { NextResponse } from "next/server";
import { listStudents } from "@/lib/admin";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  return NextResponse.json({ students: await listStudents(), me: user.id });
}
