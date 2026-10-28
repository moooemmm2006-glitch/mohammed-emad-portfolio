import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { saveSkillScore } from "@/lib/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  skill: z.enum(["read", "write"]),
  topic: z.number().int().min(1).max(100),
  part: z.number().int().min(0).max(5),
  score: z.number().min(0).max(100),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const { skill, topic, part, score } = parsed.data;
  await saveSkillScore(user.id, skill, topic, part, score);
  return NextResponse.json({ ok: true });
}
