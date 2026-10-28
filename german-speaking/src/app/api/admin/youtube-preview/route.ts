import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { getSiteLinks, youtubeOEmbed } from "@/lib/site";
import { isOwnChannel, parseYouTubeId } from "@/lib/siteShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin preview of a pasted video link: ID, title and whether it is on the owner's channel.
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const id = parseYouTubeId(new URL(req.url).searchParams.get("link") ?? "");
  if (!id) return jsonError(400, "invalid_video", "Not a YouTube video link");
  const meta = await youtubeOEmbed(id);
  if (meta === "missing") return jsonError(404, "video_not_found", "YouTube doesn't know this video");
  const { channelUrl } = await getSiteLinks();
  return NextResponse.json({ youtubeId: id, title: meta?.title ?? null, author: meta?.author ?? null, ownChannel: meta ? isOwnChannel(meta.authorUrl, channelUrl) : null });
}
