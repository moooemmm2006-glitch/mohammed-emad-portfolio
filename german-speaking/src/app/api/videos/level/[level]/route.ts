import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getTopic } from "@/lib/book";
import { TOPIC_RANGE } from "@/lib/bookLevels";
import { topicVideosMap } from "@/lib/easyGerman";
import { isLevel } from "@/lib/levels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ level: string }> }) {
  if (!(await currentUser())) return unauthorized();
  const raw = (await params).level.toUpperCase();
  if (!isLevel(raw) || (raw !== "B1" && raw !== "B2")) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  const [from, to] = TOPIC_RANGE[raw];
  const numbers = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const [videoMap, topics] = await Promise.all([topicVideosMap(numbers), Promise.all(numbers.map((n) => getTopic(raw, n)))]);
  const videos = numbers.flatMap((topic, i) => {
    const list = videoMap.get(topic) ?? [];
    const bookTopic = topics[i];
    return bookTopic && list.length ? [{ topic, title: bookTopic.title_de, titleAr: bookTopic.title_ar, videos: list }] : [];
  });
  return NextResponse.json({ videos });
}
