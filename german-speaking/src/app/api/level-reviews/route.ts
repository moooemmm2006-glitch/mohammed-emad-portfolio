import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { isLevel } from "@/lib/levels";
import { approvedLevelReviews, deleteMyLevelReview, LEVEL_REVIEW_MAX, LEVEL_REVIEW_MIN, LEVEL_REVIEW_MIN_PROGRESS, levelProgressPercent, myLevelReview, type ReviewTarget, saveLevelReview, SITE_REVIEW } from "@/lib/levelReviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 💬 level = A1…B2, or SITE for an opinion of the whole website (any learner may write one).
// GET ?level=A1 → approved opinions + average + mine + whether I may write one.
// POST {level, rating, comment} → write/rewrite mine (goes to the admin). DELETE ?level= → remove mine.

const levelOf = (v: unknown): ReviewTarget | null => {
  const up = typeof v === "string" ? v.toUpperCase() : "";
  return up === SITE_REVIEW ? SITE_REVIEW : isLevel(up) ? up : null;
};
const progressFor = (userId: string, level: ReviewTarget) => (level === SITE_REVIEW ? Promise.resolve(100) : levelProgressPercent(userId, level));
const minFor = (level: ReviewTarget) => (level === SITE_REVIEW ? 0 : LEVEL_REVIEW_MIN_PROGRESS);

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = levelOf(new URL(req.url).searchParams.get("level"));
  if (!level) return jsonError(400, "invalid_query", "level required");
  const [list, mine, progress] = await Promise.all([approvedLevelReviews(level), myLevelReview(user.id, level), progressFor(user.id, level)]);
  return NextResponse.json({
    ...list,
    mine: mine ? { rating: mine.rating, comment: mine.comment, status: mine.status } : null,
    progress,
    minProgress: minFor(level),
    canWrite: progress >= minFor(level),
  });
}

const Body = z.object({ level: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().trim().min(LEVEL_REVIEW_MIN).max(LEVEL_REVIEW_MAX) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  const level = parsed.success ? levelOf(parsed.data.level) : null;
  if (!parsed.success || !level) return jsonError(400, "invalid_body", `Rating 1–5 and ${LEVEL_REVIEW_MIN}–${LEVEL_REVIEW_MAX} characters.`);
  if ((await progressFor(user.id, level)) < minFor(level)) return jsonError(403, "not_enough_progress", String(minFor(level)));
  await saveLevelReview(user.id, level, parsed.data.rating, parsed.data.comment);
  return NextResponse.json({ status: "pending" }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = levelOf(new URL(req.url).searchParams.get("level"));
  if (!level) return jsonError(400, "invalid_query", "level required");
  await deleteMyLevelReview(user.id, level);
  return NextResponse.json({ ok: true });
}
