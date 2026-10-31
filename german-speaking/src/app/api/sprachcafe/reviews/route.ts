import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { addReview, deleteReview, REVIEW_MAX_COMMENT, reviewEligibility, teacherRatings, teacherReviews } from "@/lib/sprachcafe/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⭐ GET ?teacher=id → summary + reviews. POST {sessionId, rating, comment} → review an attended session.
// DELETE ?id= → the admin removes a review.

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const teacher = new URL(req.url).searchParams.get("teacher") ?? "";
  if (!teacher || teacher.length > 80) return jsonError(400, "invalid_query", "teacher required");
  const summary = (await teacherRatings([teacher])).get(teacher)!;
  return NextResponse.json({ ...summary, reviews: await teacherReviews(teacher) });
}

const Body = z.object({ sessionId: z.string().min(1).max(80), rating: z.number().int().min(1).max(5), comment: z.string().max(REVIEW_MAX_COMMENT).default("") });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", "Rating 1–5 and a short comment.");
  const ok = await reviewEligibility(user.id, parsed.data.sessionId);
  if (ok === "not_found") return jsonError(404, "not_found", "Session not found.");
  if (ok === "not_booked") return jsonError(403, "not_booked", "Only learners who attended can review.");
  if (ok === "not_ended") return jsonError(409, "not_ended", "You can review after the session.");
  if (ok === "already") return jsonError(409, "already_reviewed", "You already reviewed this session.");
  const id = await addReview(user.id, parsed.data.sessionId, parsed.data.rating, parsed.data.comment);
  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!(await deleteReview(id))) return jsonError(404, "not_found", "Review not found.");
  return NextResponse.json({ ok: true });
}
