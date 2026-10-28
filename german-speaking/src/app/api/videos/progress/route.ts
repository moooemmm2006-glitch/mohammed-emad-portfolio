import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getVideoProgress, saveVideoProgress, VIDEO_KEY } from "@/lib/videoProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json({ items: await getVideoProgress(user.id) });
}

const Body = z.object({
  key: z.string().regex(VIDEO_KEY),
  position: z.number().min(0).max(24 * 3600).optional(),
  duration: z.number().min(0).max(24 * 3600).nullable().optional(),
  watched: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const { key, ...p } = parsed.data;
  return NextResponse.json(await saveVideoProgress(user.id, key, p));
}
