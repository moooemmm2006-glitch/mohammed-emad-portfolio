import { NextResponse } from "next/server";
import { z } from "zod";
import { generateReport, getReport, ReportError } from "@/lib/report/generate";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const r = getReport(id);
  return r ? NextResponse.json(r) : jsonError(404, "not_found", "No report yet");
}

const Body = z.object({ language: z.enum(["ar", "en", "de"]).optional() });

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = Body.safeParse((await readJson(req)) ?? {});
  try {
    const report = await generateReport(id, { language: body.success ? body.data.language : undefined });
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof ReportError) {
      const status = err.code === "not_found" ? 404 : err.code === "too_short" ? 422 : 502;
      return jsonError(status, err.code, err.message);
    }
    console.error("[report] failed:", err);
    return jsonError(500, "report_failed", err instanceof Error ? err.message : "Report failed");
  }
}
