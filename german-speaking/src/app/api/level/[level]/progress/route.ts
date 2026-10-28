import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { isLevel } from "@/lib/levels";
import { levelSkillProgress } from "@/lib/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ level: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = (await params).level.toUpperCase();
  if (!isLevel(level)) return jsonError(404, "not_found", "Unknown level");
  return NextResponse.json(await levelSkillProgress(user.id, level));
}
