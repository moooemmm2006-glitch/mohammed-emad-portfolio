import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { levelOfTopic } from "@/lib/bookLevels";
import { topicVideos } from "@/lib/easyGerman";
import { lockedResponse, topicLock } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Easy German videos of one book topic (file + admin changes).
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const n = Number((await params).n);
  if (!Number.isInteger(n) || !levelOfTopic(n)) return jsonError(404, "not_found", "Unknown topic");
  const lock = await topicLock(user.id, n);
  if (lock?.locked) return lockedResponse(lock);
  return NextResponse.json({ videos: await topicVideos(n) });
}
