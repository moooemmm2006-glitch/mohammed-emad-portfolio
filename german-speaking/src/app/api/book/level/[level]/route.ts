import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { topicSummaries } from "@/lib/book";
import { topicProgress } from "@/lib/bookProgress";
import { isLevel } from "@/lib/levels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The level's book topics (titles and intros only) with this learner's progress.
export async function GET(_req: Request, { params }: { params: Promise<{ level: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = (await params).level.toUpperCase();
  if (!isLevel(level)) return jsonError(404, "not_found", "Unknown level");
  const topics = await topicSummaries(level);
  const progress = await topicProgress(user.id, new Map(topics.map((t) => [t.number, t.sentenceCount])));
  return NextResponse.json({
    topics: topics.map((t) => ({ ...t, progress: progress.get(t.number) ?? { practiced: 0, correct: 0, total: t.sentenceCount, done: false } })),
  });
}
