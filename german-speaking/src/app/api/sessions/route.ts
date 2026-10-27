import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getSettings, getWeaknesses } from "@/lib/db/repo";
import { LEVELS } from "@/lib/levels";
import { pickFocus } from "@/lib/report/weakness";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ level: z.enum(LEVELS), topic: z.string().max(200).nullable().optional() });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const focus = (await getSettings(user.id)).focusSteering ? pickFocus(await getWeaknesses(user.id)) : null;
  const s = await createSession(parsed.data.level, parsed.data.topic ?? null, focus?.tag ?? null, user.id);
  return NextResponse.json({ session: s, focus: focus?.tag ?? null });
}
