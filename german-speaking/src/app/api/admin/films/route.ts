import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { addFilm, listFilms, removeFilm } from "@/lib/films";
import { YOUTUBE_ID } from "@/lib/easyGermanShared";
import { youtubeOEmbed } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({ films: await listFilms() });
}

const Body = z.object({
  title: z.string().trim().min(1).max(160),
  year: z.number().int().min(1900).max(2100),
  genre: z.string().trim().max(100).optional(),
  summary: z.string().trim().min(10).max(1000),
  usefulness: z.string().trim().max(300).optional(),
  youtubeId: z.string().regex(YOUTUBE_ID).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const { youtubeId, ...fields } = parsed.data;
  let channel: string | undefined;
  let sourceUrl: string | undefined;
  if (youtubeId) {
    const meta = await youtubeOEmbed(youtubeId);
    if (meta === "missing") return jsonError(400, "video_not_found", "YouTube doesn't know this video");
    if (!meta) return jsonError(503, "video_unverified", "YouTube could not verify this video right now");
    channel = meta.author;
    sourceUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  }
  await addFilm({ ...fields, year: fields.year, summary: fields.summary, ...(youtubeId ? { youtubeId, channel, sourceUrl } : {}) });
  return NextResponse.json({ films: await listFilms() });
}

const DeleteBody = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/) });

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = DeleteBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  if (!(await removeFilm(parsed.data.id))) return jsonError(404, "not_found", "No such film");
  return NextResponse.json({ films: await listFilms() });
}
