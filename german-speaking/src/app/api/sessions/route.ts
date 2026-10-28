import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getSettings, getWeaknesses } from "@/lib/db/repo";
import { LEVELS } from "@/lib/levels";
import { levelOfTopic } from "@/lib/book";
import { getVideoThema } from "@/lib/videoThema";
import { pickFocus } from "@/lib/report/weakness";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  level: z.enum(LEVELS),
  topic: z.string().max(200).nullable().optional(),
  bookTopic: z.number().int().min(1).max(100).nullable().optional(),
  /** "اتكلم عن اللي شفته": Nicos Weg (A1–B1) or a Video-Thema episode (B2). */
  video: z.union([z.object({ kind: z.literal("nicos") }), z.object({ kind: z.literal("videothema"), id: z.string().regex(/^[0-9a-f]{16}$/) })]).nullable().optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const bookTopic = parsed.data.bookTopic ?? null;
  // A book topic belongs to its own level's partner (B2 topics → B2 partner, …).
  if (bookTopic && levelOfTopic(bookTopic) !== parsed.data.level) return jsonError(400, "wrong_level", "This topic belongs to another level");
  let video: string | null = null;
  const v = parsed.data.video;
  if (v?.kind === "nicos") {
    if (parsed.data.level === "B2") return jsonError(400, "wrong_level", "Nicos Weg ends at B1");
    video = JSON.stringify({ kind: "nicos", level: parsed.data.level });
  } else if (v?.kind === "videothema") {
    if (parsed.data.level !== "B2") return jsonError(400, "wrong_level", "Video-Thema is B2");
    // Title and description come from DW's feed on the server, not from the browser.
    const ep = (await getVideoThema()).episodes.find((e) => e.id === v.id);
    video = JSON.stringify({ kind: "videothema", id: v.id, title: ep?.title ?? "Video-Thema", summary: ep?.summary ?? "" });
  }
  const focus = (await getSettings(user.id)).focusSteering ? pickFocus(await getWeaknesses(user.id)) : null;
  const s = await createSession(parsed.data.level, parsed.data.topic ?? null, focus?.tag ?? null, user.id, bookTopic, video);
  return NextResponse.json({ session: s, focus: focus?.tag ?? null });
}
