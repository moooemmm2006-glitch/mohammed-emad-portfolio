import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getTopicByNumber } from "@/lib/book";
import { sentenceScores } from "@/lib/bookProgress";
import { lockedResponse, topicLock } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One whole topic (only the opened topic is sent to the browser) and the learner's best scores.
export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const n = Number((await params).number);
  const topic = Number.isInteger(n) ? await getTopicByNumber(n) : null;
  if (!topic) return jsonError(404, "not_found", "Unknown topic");
  const lock = await topicLock(user.id, topic.number);
  if (lock?.locked) return lockedResponse(lock);
  return NextResponse.json({ topic, scores: await sentenceScores(user.id, topic.number) });
}
