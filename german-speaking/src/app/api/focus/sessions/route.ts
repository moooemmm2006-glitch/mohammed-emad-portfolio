import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { saveFocusSession } from "@/lib/focus";
import { FOCUS_MAX } from "@/lib/focusShared";
import { LEVELS } from "@/lib/levels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  startedAt: z.number().int().positive(),
  minutes: z.number().min(1).max(FOCUS_MAX),
  goal: z.string().max(140).nullable().optional(),
  level: z.enum(LEVELS).nullable().optional(),
  tz: z.number().int().min(-900).max(900).optional(),
});

// A finished ⏱️ focus session → the vault; answers with the new stats and badges for the celebration.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const { tz = 0, ...input } = parsed.data;
  if (input.startedAt > Date.now()) return jsonError(400, "in_future", "Session can't start in the future");
  return NextResponse.json(await saveFocusSession(user.id, input, tz));
}
