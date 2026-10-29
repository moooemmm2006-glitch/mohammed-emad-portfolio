import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { isLevel } from "@/lib/levels";
import { grammarLessons } from "@/lib/grammar/course";
export const dynamic = "force-static";
export async function GET(_req: Request, { params }: { params: Promise<{ level: string }> }) {
  const level = (await params).level.toUpperCase();
  if (!isLevel(level)) return jsonError(404, "not_found", "Unknown level");
  return NextResponse.json(grammarLessons(level));
}
