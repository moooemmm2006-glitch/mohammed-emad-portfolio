import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getSettings, getWeaknesses } from "@/lib/db/repo";
import { LEVELS } from "@/lib/levels";
import { levelOfTopic } from "@/lib/book";
import { pickFocus } from "@/lib/report/weakness";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  level: z.enum(LEVELS),
  topic: z.string().max(200).nullable().optional(),
  bookTopic: z.number().int().min(1).max(100).nullable().optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const bookTopic = parsed.data.bookTopic ?? null;
  // A book topic belongs to its own level's partner (B2 topics → B2 partner, …).
  if (bookTopic && levelOfTopic(bookTopic) !== parsed.data.level) return jsonError(400, "wrong_level", "This topic belongs to another level");
  const focus = (await getSettings(user.id)).focusSteering ? pickFocus(await getWeaknesses(user.id)) : null;
  const s = await createSession(parsed.data.level, parsed.data.topic ?? null, focus?.tag ?? null, user.id, bookTopic);
  return NextResponse.json({ session: s, focus: focus?.tag ?? null });
}
