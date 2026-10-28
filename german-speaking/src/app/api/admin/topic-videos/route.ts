import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { levelOfTopic } from "@/lib/bookLevels";
import { adminAddVideo, adminRemoveVideo, getEasyGermanVideos, hiddenVideos, topicVideos } from "@/lib/easyGerman";
import { parseYouTubeId, YOUTUBE_ID } from "@/lib/easyGermanShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: add or remove Easy German videos of a book topic (stored in the database, merged with the JSON file).

const Topic = z.number().int().min(1).max(100);

async function guard() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  return null;
}

/** Title and channel from YouTube's oEmbed (also proves the video exists); null when YouTube can't be reached. */
async function oEmbed(id: string): Promise<{ title: string; channel: string } | "missing" | null> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(4000) });
    if (r.status === 404 || r.status === 400 || r.status === 401) return "missing";
    if (!r.ok) return null;
    const d = (await r.json()) as { title?: string; author_name?: string };
    return d.title ? { title: d.title, channel: d.author_name || "Easy German" } : null;
  } catch {
    return null;
  }
}

async function state(topic: number) {
  return { topic, videos: await topicVideos(topic), hidden: await hiddenVideos(topic) };
}

export async function GET(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const topic = Number(new URL(req.url).searchParams.get("topic"));
  if (!Topic.safeParse(topic).success || !levelOfTopic(topic)) return jsonError(400, "invalid_topic", "Topic 1–100");
  return NextResponse.json(await state(topic));
}

const AddBody = z.object({ topic: Topic, link: z.string().min(1).max(500), title: z.string().trim().max(200).optional() });

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = AddBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const id = parseYouTubeId(parsed.data.link);
  if (!id) return jsonError(400, "invalid_link", "Not a YouTube link with an 11-character video ID");
  // A video from the (already verified) JSON file just comes back; new ones are checked with YouTube.
  if (getEasyGermanVideos(parsed.data.topic).some((v) => v.youtubeId === id)) {
    await adminAddVideo(parsed.data.topic, id, "");
    return NextResponse.json(await state(parsed.data.topic));
  }
  const meta = await oEmbed(id);
  if (meta === "missing") return jsonError(400, "video_not_found", "YouTube doesn't know this video");
  const title = parsed.data.title || meta?.title || `YouTube ${id}`;
  await adminAddVideo(parsed.data.topic, id, title, meta?.channel ?? "Easy German");
  return NextResponse.json(await state(parsed.data.topic));
}

const DeleteBody = z.object({ topic: Topic, youtubeId: z.string().regex(YOUTUBE_ID) });

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = DeleteBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  await adminRemoveVideo(parsed.data.topic, parsed.data.youtubeId);
  return NextResponse.json(await state(parsed.data.topic));
}
