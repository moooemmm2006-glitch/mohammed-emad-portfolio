import { NextResponse } from "next/server";
import { deleteAll, exportAll, importAll, type ExportData } from "@/lib/db/repo";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const data = await exportAll(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="german-speaking-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const data = await readJson<ExportData>(req);
  if (!data) return jsonError(400, "invalid_json", "File is not valid JSON");
  try {
    await importAll(data, user.id);
    return NextResponse.json({ ok: true, sessions: data.sessions.length });
  } catch (err) {
    return jsonError(400, "invalid_export", err instanceof Error ? err.message : "Import failed");
  }
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return unauthorized();
  await deleteAll(user.id);
  return NextResponse.json({ ok: true });
}
