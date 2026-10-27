import { NextResponse } from "next/server";
import { deleteSession, getReport, getSession, getTurns, parseMeta } from "@/lib/db/repo";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return jsonError(404, "not_found", "Session not found");
  const turns = (await getTurns(id)).map((t) => ({ ...t, meta: parseMeta(t) }));
  return NextResponse.json({ session, turns, report: await getReport(id) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!await getSession(id)) return jsonError(404, "not_found", "Session not found");
  await deleteSession(id);
  return NextResponse.json({ ok: true });
}
