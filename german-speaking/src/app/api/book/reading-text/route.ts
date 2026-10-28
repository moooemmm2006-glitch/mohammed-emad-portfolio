import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getTopicByNumber } from "@/lib/book";
import { getLLM } from "@/lib/llm";
import { newReadingText } from "@/lib/writing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ topic: z.number().int().min(1).max(100) });

// "نص جديد عن الموضوع ده" — only with an API key.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const llm = getLLM();
  if (!llm) return jsonError(501, "need_api", "Needs an API key");
  const topic = await getTopicByNumber(parsed.data.topic);
  if (!topic) return jsonError(404, "not_found", "Unknown topic");
  try {
    return NextResponse.json({ text: await newReadingText(topic, llm) });
  } catch (err) {
    console.error("[reading-text] failed:", err);
    return jsonError(502, "llm_failed", "Could not write a text");
  }
}
