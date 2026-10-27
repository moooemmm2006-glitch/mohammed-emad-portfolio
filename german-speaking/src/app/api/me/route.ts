import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { authErrorResponse } from "@/lib/auth/routes";
import { toPublic, updateName } from "@/lib/auth/users";
import { sessionsWithTurnCounts } from "@/lib/db/repo";
import { dayKey, practiceStreak } from "@/lib/stats";
import { getUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The logged-in user plus what the profile menu shows (last level, streak, today's usage).
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const tz = Number(new URL(req.url).searchParams.get("tz") ?? 0);
  const offset = Number.isFinite(tz) ? tz : 0;
  const spoken = (await sessionsWithTurnCounts(user.id)).filter((x) => x.userTurns > 0);
  const now = Date.now();
  return NextResponse.json({
    user: toPublic(user),
    lastLevel: spoken[0]?.session.level ?? null,
    streak: practiceStreak(new Set(spoken.map((x) => dayKey(x.session.startedAt, offset))), dayKey(now, offset)),
    usage: await getUsage(user.id, now),
    limits: user.role === "admin" ? null : { minutes: user.dailyMinutes, replies: user.dailyReplies },
  });
}

const Patch = z.object({ name: z.string().max(200) });

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Patch.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", "Invalid body");
  try {
    await updateName(user.id, parsed.data.name);
    return NextResponse.json({ user: { ...toPublic(user), name: parsed.data.name.trim() } });
  } catch (err) {
    return authErrorResponse(err);
  }
}
