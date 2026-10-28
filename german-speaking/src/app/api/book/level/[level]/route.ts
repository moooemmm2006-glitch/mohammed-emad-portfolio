import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { topicSummaries } from "@/lib/book";
import { dueReview, topicProgress } from "@/lib/bookProgress";
import { levelOfTopic } from "@/lib/book";
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
  const [progress, due] = await Promise.all([topicProgress(user.id, new Map(topics.map((t) => [t.number, t.sentenceCount]))), dueReview(user.id, Date.now(), 500)]);
  return NextResponse.json({
    // Sentences of this level due for review today (sent with the topics so the page doesn't jump).
    due: due.filter((d) => levelOfTopic(d.topic) === level).length,
    topics: topics.map((t) => ({ ...t, progress: progress.get(t.number) ?? { practiced: 0, correct: 0, total: t.sentenceCount, done: false } })),
  });
}
