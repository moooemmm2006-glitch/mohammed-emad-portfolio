import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { LEVELS } from "@/lib/levels";
import { levelSkillProgress } from "@/lib/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "تقدّمي": the four skills for every level.
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const levels = await Promise.all(LEVELS.map(async (level) => ({ level, ...(await levelSkillProgress(user.id, level)) })));
  return NextResponse.json({ levels });
}
