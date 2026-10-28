import { NextResponse } from "next/server";
import { deleteSession, getReport, getTurns } from "@/lib/db/repo";
import { currentUser, ownSession, unauthorized } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A past conversation's saved report (read-only; conversations now happen in Gemini).

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const session = await ownSession(id, user);
  if (!session) return jsonError(404, "not_found", "Report not found");
  const turns = (await getTurns(id)).map(({ id, role, text, confidence }) => ({ id, role, text, confidence }));
  return NextResponse.json({ session, turns, report: await getReport(id) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!(await ownSession(id, user))) return jsonError(404, "not_found", "Report not found");
  await deleteSession(id);
  return NextResponse.json({ ok: true });
}
