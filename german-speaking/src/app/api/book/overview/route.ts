import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { topicSummaries } from "@/lib/book";
import { dueReview, listPractice, topicProgress } from "@/lib/bookProgress";
import { LEVELS } from "@/lib/levels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Book progress for "تقدّمي": finished topics per level, sentences practised, reviews due, recent runs.
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const levels = await Promise.all(
    LEVELS.map(async (level) => {
      const topics = await topicSummaries(level);
      const p = await topicProgress(user.id, new Map(topics.map((t) => [t.number, t.sentenceCount])));
      const started = topics.filter((t) => p.has(t.number)).map((t) => ({ number: t.number, title_de: t.title_de, title_ar: t.title_ar, ...p.get(t.number)! }));
      return {
        level,
        topics: topics.length,
        done: started.filter((t) => t.done).length,
        sentences: topics.reduce((n, t) => n + t.sentenceCount, 0),
        correct: started.reduce((n, t) => n + t.correct, 0),
        started,
      };
    }),
  );
  const practice = (await listPractice(user.id, 10)).map((r) => ({
    id: r.id,
    topic: r.topic,
    mode: r.mode,
    createdAt: r.createdAt,
    total: r.results.length,
    correct: r.results.filter((x) => x.score >= 85).length,
  }));
  return NextResponse.json({ levels, due: (await dueReview(user.id, Date.now(), 200)).length, practice });
}
