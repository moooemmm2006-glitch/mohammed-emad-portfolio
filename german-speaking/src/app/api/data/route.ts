import { NextResponse } from "next/server";
import { deleteAll, exportAll, importAll, type ExportData } from "@/lib/db/repo";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const data = exportAll();
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="german-speaking-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

export async function POST(req: Request) {
  const data = await readJson<ExportData>(req);
  if (!data) return jsonError(400, "invalid_json", "File is not valid JSON");
  try {
    importAll(data);
    return NextResponse.json({ ok: true, sessions: data.sessions.length });
  } catch (err) {
    return jsonError(400, "invalid_export", err instanceof Error ? err.message : "Import failed");
  }
}

export function DELETE() {
  deleteAll();
  return NextResponse.json({ ok: true });
}
