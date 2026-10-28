import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { TOPIC_RANGE } from "@/lib/bookLevels";
import { easyGermanProgress } from "@/lib/easyGerman";
import { LEVELS, type Level } from "@/lib/levels";
import { levelSkillProgress } from "@/lib/skills";
import { getVideoProgress } from "@/lib/videoProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const range = ([a, b]: [number, number]) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// "تقدّمي": the four skills for every level, plus the Easy German videos watched.
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const watched = new Set((await getVideoProgress(user.id)).filter((v) => v.watched).map((v) => v.key));
  const eg = await easyGermanProgress(watched, Object.fromEntries(LEVELS.map((l) => [l, range(TOPIC_RANGE[l])])) as Record<Level, number[]>);
  const levels = await Promise.all(LEVELS.map(async (level) => ({ level, ...(await levelSkillProgress(user.id, level)), easyGerman: eg[level] })));
  return NextResponse.json({ levels });
}
