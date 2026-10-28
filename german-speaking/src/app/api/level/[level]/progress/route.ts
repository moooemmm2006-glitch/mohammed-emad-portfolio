import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { isLevel } from "@/lib/levels";
import { levelSkillProgress } from "@/lib/skills";
import { levelFocusMinutes } from "@/lib/focus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ level: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = (await params).level.toUpperCase();
  if (!isLevel(level)) return jsonError(404, "not_found", "Unknown level");
  // Plus the ⏱️ focus minutes done on this level's pages (study time, not one skill).
  const [skills, focusMinutes] = await Promise.all([levelSkillProgress(user.id, level), levelFocusMinutes(user.id, level)]);
  return NextResponse.json({ ...skills, focusMinutes });
}
