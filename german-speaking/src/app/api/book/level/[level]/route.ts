import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { topicSummaries } from "@/lib/book";
import { dueReview, topicProgress } from "@/lib/bookProgress";
import { levelOfTopic } from "@/lib/book";
import { isLevel } from "@/lib/levels";
import { topicVideosMap } from "@/lib/easyGerman";
import { egKey } from "@/lib/easyGermanShared";
import { getVideoProgress } from "@/lib/videoProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The level's book topics (titles and intros only) with this learner's progress.
export async function GET(_req: Request, { params }: { params: Promise<{ level: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = (await params).level.toUpperCase();
  if (!isLevel(level)) return jsonError(404, "not_found", "Unknown level");
  const topics = await topicSummaries(level);
  const [progress, due, videos, watched] = await Promise.all([
    topicProgress(user.id, new Map(topics.map((t) => [t.number, t.sentenceCount]))),
    dueReview(user.id, Date.now(), 500),
    topicVideosMap(topics.map((t) => t.number)),
    getVideoProgress(user.id).then((xs) => new Set(xs.filter((x) => x.watched).map((x) => x.key))),
  ]);
  return NextResponse.json({
    // Sentences of this level due for review today (sent with the topics so the page doesn't jump).
    due: due.filter((d) => levelOfTopic(d.topic) === level).length,
    topics: topics.map((t) => {
      const vids = videos.get(t.number) ?? [];
      return {
        ...t,
        progress: progress.get(t.number) ?? { practiced: 0, correct: 0, total: t.sentenceCount, done: false },
        // Easy German videos of the topic ("🎧 X/Y" on the card).
        videos: { watched: vids.filter((v) => watched.has(egKey(v.youtubeId))).length, total: vids.length },
      };
    }),
  });
}
