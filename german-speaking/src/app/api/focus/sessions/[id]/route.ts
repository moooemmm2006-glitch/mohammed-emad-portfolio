import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { setGoalDone } from "@/lib/focus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ goalDone: z.boolean() });

// "هدفك: … ✓ عملته؟" → أيوه / لسه
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  if (!(await setGoalDone(user.id, (await params).id, parsed.data.goalDone))) return jsonError(404, "not_found", "No such session");
  return NextResponse.json({ ok: true });
}
