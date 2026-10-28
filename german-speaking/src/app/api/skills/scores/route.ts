import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { TOPIC_RANGE } from "@/lib/book";
import { isLevel } from "@/lib/levels";
import { skillScores } from "@/lib/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best reading/writing scores for a level's topics: { "12:3": 80 }.
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const skill = url.searchParams.get("skill");
  const level = url.searchParams.get("level")?.toUpperCase();
  if ((skill !== "read" && skill !== "write") || !isLevel(level)) return jsonError(400, "invalid_query", "skill and level required");
  const [a, b] = TOPIC_RANGE[level];
  return NextResponse.json({ scores: await skillScores(user.id, skill, Array.from({ length: b - a + 1 }, (_, i) => a + i)) });
}
