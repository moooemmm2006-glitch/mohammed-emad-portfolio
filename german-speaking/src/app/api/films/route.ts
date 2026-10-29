import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { listFilms } from "@/lib/films";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await currentUser())) return unauthorized();
  return NextResponse.json({ films: await listFilms() });
}
