import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getTopicByNumber } from "@/lib/book";
import { isLevel } from "@/lib/levels";
import { JOURNAL_GOAL, JOURNAL_MAX_CHARS, journalEntries, saveJournalEntry } from "@/lib/journal";
import { lockedResponse, topicLock } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✍️ "اكتب عن الموضوع": GET ?topic=n → my texts about it; POST {topic, text} → save one.

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const n = Number(new URL(req.url).searchParams.get("topic"));
  const topic = Number.isInteger(n) ? await getTopicByNumber(n) : null;
  if (!topic || !isLevel(topic.level)) return jsonError(404, "not_found", "Unknown topic");
  const lock = await topicLock(user.id, topic.number);
  if (lock?.locked) return lockedResponse(lock);
  return NextResponse.json({ entries: await journalEntries(user.id, topic.number), goal: JOURNAL_GOAL[topic.level] });
}

const Body = z.object({ topic: z.number().int().min(1).max(200), text: z.string().trim().min(1).max(JOURNAL_MAX_CHARS) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", "Write something first (max 5000 characters).");
  const topic = await getTopicByNumber(parsed.data.topic);
  if (!topic || !isLevel(topic.level)) return jsonError(404, "not_found", "Unknown topic");
  const lock = await topicLock(user.id, topic.number);
  if (lock?.locked) return lockedResponse(lock);
  const saved = await saveJournalEntry(user.id, { topic: topic.number, level: topic.level, text: parsed.data.text });
  return NextResponse.json({ ...saved, goal: JOURNAL_GOAL[topic.level] }, { status: 201 });
}
