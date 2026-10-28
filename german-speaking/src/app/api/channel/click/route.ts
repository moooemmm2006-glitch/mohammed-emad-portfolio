import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { recordChannelClick } from "@/lib/site";
import { CLICK_PLACES } from "@/lib/siteShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ place: z.enum(CLICK_PLACES) });

// Counts a click on a "subscribe to my channel" button (only a number per place, nothing about the user).
export async function POST(req: Request) {
  if (!(await currentUser())) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  await recordChannelClick(parsed.data.place);
  return NextResponse.json({ ok: true });
}
