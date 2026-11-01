import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { deleteLevelReview, levelReviewsByStatus, setLevelReviewStatus } from "@/lib/levelReviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: approve / hide / delete learners' opinions of a level before they show on the site.

async function admin() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  return null;
}

const Status = z.enum(["pending", "approved", "rejected"]);

export async function GET(req: Request) {
  const denied = await admin();
  if (denied) return denied;
  const status = Status.safeParse(new URL(req.url).searchParams.get("status") ?? "pending");
  if (!status.success) return jsonError(400, "invalid_query", "Unknown status");
  return NextResponse.json({ reviews: await levelReviewsByStatus(status.data) });
}

const Body = z.object({ id: z.string().min(1).max(80), status: Status });

export async function PATCH(req: Request) {
  const denied = await admin();
  if (denied) return denied;
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", "id and status");
  if (!(await setLevelReviewStatus(parsed.data.id, parsed.data.status))) return jsonError(404, "not_found", "Review not found.");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await admin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!(await deleteLevelReview(id))) return jsonError(404, "not_found", "Review not found.");
  return NextResponse.json({ ok: true });
}
