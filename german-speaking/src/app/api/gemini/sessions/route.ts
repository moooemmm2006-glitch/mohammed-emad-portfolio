import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { GEMINI_TEXT_MAX, listGeminiSessions, saveGeminiSession } from "@/lib/gemini";
import { LEVELS } from "@/lib/levels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  level: z.enum(LEVELS),
  topic: z.number().int().min(1).max(100).nullable().optional(),
  video: z.string().max(300).nullable().optional(),
  text: z.string().trim().min(1).max(GEMINI_TEXT_MAX),
});

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json({ sessions: await listGeminiSessions(user.id) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  return NextResponse.json({ session: await saveGeminiSession(user.id, parsed.data) });
}
