import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { addReadingNote, listReadingNotes } from "@/lib/reading";
import { isReadingLevel } from "@/lib/readingShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ level: string }> };
const NoteBody = z.object({
  word: z.string().trim().min(1).max(160),
  meaning: z.string().trim().max(300).default(""),
  sentence: z.string().trim().max(600).default(""),
  page: z.number().int().min(1).max(5000).nullable().default(null),
});

export async function GET(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = (await params).level.toUpperCase();
  if (!isReadingLevel(level)) return jsonError(404, "not_found", "Unknown level");
  return NextResponse.json({ notes: await listReadingNotes(user.id, level) });
}

export async function POST(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = (await params).level.toUpperCase();
  if (!isReadingLevel(level)) return jsonError(404, "not_found", "Unknown level");
  const parsed = NoteBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_note", parsed.error.message);
  return NextResponse.json({ note: await addReadingNote(user.id, level, parsed.data) });
}
