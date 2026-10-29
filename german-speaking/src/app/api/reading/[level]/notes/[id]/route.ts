import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { deleteReadingNote, updateReadingNote } from "@/lib/reading";
import { isReadingLevel } from "@/lib/readingShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ level: string; id: string }> };
const NoteBody = z.object({
  word: z.string().trim().min(1).max(160),
  meaning: z.string().trim().max(300).default(""),
  sentence: z.string().trim().max(600).default(""),
  page: z.number().int().min(1).max(5000).nullable().default(null),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { level: rawLevel, id } = await params;
  const level = rawLevel.toUpperCase();
  if (!isReadingLevel(level)) return jsonError(404, "not_found", "Unknown level");
  const parsed = NoteBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_note", parsed.error.message);
  if (!(await updateReadingNote(user.id, level, id, parsed.data))) return jsonError(404, "not_found", "Note not found");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { level: rawLevel, id } = await params;
  const level = rawLevel.toUpperCase();
  if (!isReadingLevel(level)) return jsonError(404, "not_found", "Unknown level");
  if (!(await deleteReadingNote(user.id, level, id))) return jsonError(404, "not_found", "Note not found");
  return NextResponse.json({ ok: true });
}
