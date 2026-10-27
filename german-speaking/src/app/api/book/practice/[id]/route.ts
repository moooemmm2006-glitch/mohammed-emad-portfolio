import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getTopicByNumber } from "@/lib/book";
import { getPractice } from "@/lib/bookProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const rec = await getPractice(user.id, (await params).id);
  if (!rec) return jsonError(404, "not_found", "Not found");
  const topic = rec.topic ? await getTopicByNumber(rec.topic) : null;
  return NextResponse.json({ ...rec, topicInfo: topic ? { number: topic.number, level: topic.level, title_de: topic.title_de, title_ar: topic.title_ar } : null });
}
