import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getSettings, getWeaknesses } from "@/lib/db/repo";
import { LEVELS } from "@/lib/levels";
import { pickFocus } from "@/lib/report/weakness";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ level: z.enum(LEVELS), topic: z.string().max(200).nullable().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const focus = getSettings().focusSteering ? pickFocus(getWeaknesses()) : null;
  const s = createSession(parsed.data.level, parsed.data.topic ?? null, focus?.tag ?? null);
  return NextResponse.json({ session: s, focus: focus?.tag ?? null });
}
