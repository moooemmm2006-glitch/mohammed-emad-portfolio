import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { DKW_CHANNEL_ID, DKW_CHANNEL_URL, parseYouTubeSource, type PodcastItem } from "@/lib/podcastShared";
import { addPodcast, listPodcasts, removePodcast } from "@/lib/podcasts";
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
  return NextResponse.json({ podcasts: await listPodcasts() });
}

const Body = z.object({
  link: z.string().trim().min(1).max(500),
  title: z.string().trim().max(200).optional(),
  levels: z.array(z.enum(["B1", "B2"])).min(1).max(2),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const source = parseYouTubeSource(parsed.data.link);
  if (!source) return jsonError(400, "invalid_link", "Use a YouTube video or playlist link");

  const meta = source.youtubeId ? await youtubeOEmbed(source.youtubeId) : null;
  if (meta === "missing") return jsonError(400, "video_not_found", "YouTube doesn't know this video");
  if (source.youtubeId && !meta) return jsonError(503, "channel_unverified", "YouTube could not verify the channel right now");
  if (meta && !isDkwChannel(meta.authorUrl, meta.author)) return jsonError(400, "wrong_channel", "This video is not from DKW Akademie");

  const item: Omit<PodcastItem, "id" | "added" | "addedAt"> = {
    ...source,
    title: parsed.data.title || (meta ? meta.title : null) || (source.youtubeId ? `DKW Akademie · ${source.youtubeId}` : "DKW Akademie Podcast playlist"),
    channel: "DKW Akademie",
    levels: [...new Set(parsed.data.levels)],
  };
  await addPodcast(item);
  return NextResponse.json({ podcasts: await listPodcasts() });
}

const DeleteBody = z.object({ id: z.string().regex(/^(video:[A-Za-z0-9_-]{11}|playlist:[A-Za-z0-9_-]{10,80})$/) });

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = DeleteBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  if (!(await removePodcast(parsed.data.id))) return jsonError(404, "not_found", "No such podcast item");
  return NextResponse.json({ podcasts: await listPodcasts() });
}

function isDkwChannel(authorUrl: string, author: string) {
  const normalized = authorUrl.toLowerCase().replace(/\/$/, "");
  return normalized.includes(DKW_CHANNEL_ID.toLowerCase()) || normalized.endsWith("/@dkwakademie") || author.trim().toLowerCase() === "dkw akademie" || normalized === DKW_CHANNEL_URL.toLowerCase();
}
