import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getTopicByNumber } from "@/lib/book";
import { getLLM } from "@/lib/llm";
import { saveSkillScore } from "@/lib/skills";
import { checkFreeWriting } from "@/lib/writing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({ topic: z.number().int().min(1).max(100), text: z.string().min(1).max(3000) });

// "اكتب بحرية" — the AI corrects the text at the learner's level; only with an API key.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const llm = getLLM();
  if (llm.provider === "mock") return jsonError(501, "need_api", "Needs an API key");
  const topic = await getTopicByNumber(parsed.data.topic);
  if (!topic) return jsonError(404, "not_found", "Unknown topic");
  try {
    const check = await checkFreeWriting(user.id, topic, parsed.data.text, llm);
    const right = check.corrections.filter((c) => c.isCorrect).length;
    if (check.corrections.length) await saveSkillScore(user.id, "write", topic.number, 2, (100 * right) / check.corrections.length);
    return NextResponse.json(check);
  } catch (err) {
    console.error("[writing] failed:", err);
    return jsonError(502, "llm_failed", "Could not correct the text");
  }
}
