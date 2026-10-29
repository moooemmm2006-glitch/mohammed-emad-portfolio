import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { books } from "../../../../../data/books";
import { completeReadingPage, getReadingState, saveReadingBook, saveReadingSteps } from "@/lib/reading";
import { isDayKey, isReadingLevel } from "@/lib/readingShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ level: string }> };
const LevelBody = z.object({ currentPage: z.number().int().min(0).max(5000), totalPages: z.number().int().min(1).max(5000).nullable() });

export async function GET(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = (await params).level.toUpperCase();
  if (!isReadingLevel(level)) return jsonError(404, "not_found", "Unknown level");
  const today = new URL(req.url).searchParams.get("day");
  if (!isDayKey(today)) return jsonError(400, "invalid_day", "A valid local day is required");
  return NextResponse.json({ book: books[level], state: await getReadingState(user.id, level, today) });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = (await params).level.toUpperCase();
  if (!isReadingLevel(level)) return jsonError(404, "not_found", "Unknown level");
  const body = await readJson<Record<string, unknown>>(req);
  if (!body || typeof body.action !== "string") return jsonError(400, "invalid_body", "Action required");
  const day = body.day;
  if (!isDayKey(day)) return jsonError(400, "invalid_day", "A valid local day is required");

  if (body.action === "book") {
    const parsed = LevelBody.safeParse(body);
    if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
    if (parsed.data.totalPages !== null && parsed.data.currentPage > parsed.data.totalPages) {
      return jsonError(400, "invalid_page", "Current page cannot exceed the page count");
    }
    await saveReadingBook(user.id, level, parsed.data.currentPage, parsed.data.totalPages);
  } else if (body.action === "steps") {
    const parsed = z.array(z.boolean()).length(3).safeParse(body.steps);
    if (!parsed.success) return jsonError(400, "invalid_steps", "Exactly three checklist values are required");
    await saveReadingSteps(user.id, level, day, parsed.data);
  } else if (body.action === "complete") {
    const current = await getReadingState(user.id, level, day);
    if (current.book.totalPages === null) return jsonError(400, "page_count_required", "Save the book page count first");
    if (current.book.currentPage >= current.book.totalPages) return jsonError(400, "book_finished", "All pages are already tracked");
    const result = await completeReadingPage(user.id, level, day);
    return NextResponse.json({ ...result, state: await getReadingState(user.id, level, day) });
  } else {
    return jsonError(400, "invalid_action", "Unknown action");
  }
  return NextResponse.json({ state: await getReadingState(user.id, level, day) });
}
