import { NextResponse } from "next/server";
import { deleteSession, getReport, getTurns, parseMeta } from "@/lib/db/repo";
import { currentUser, ownSession, unauthorized } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const session = await ownSession(id, user);
  if (!session) return jsonError(404, "not_found", "Session not found");
  const turns = (await getTurns(id)).map((t) => ({ ...t, meta: parseMeta(t) }));
  return NextResponse.json({ session, turns, report: await getReport(id) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!(await ownSession(id, user))) return jsonError(404, "not_found", "Session not found");
  await deleteSession(id);
  return NextResponse.json({ ok: true });
}
