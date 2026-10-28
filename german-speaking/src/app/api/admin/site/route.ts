import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { channelClicks, checkChannelPhoto, getSiteLinks, saveSiteLinks } from "@/lib/site";
import { parseChannelUrl, parsePlaylistId, parseYouTubeId, type SiteLinks } from "@/lib/siteShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: "قناتي على يوتيوب" — channel link, explainer video, tutorials playlist, channel photo.

async function guard() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({ links: await getSiteLinks(), clicks: await channelClicks() });
}

// A string sets the link (validated); "" or null removes it.
const Field = z.string().max(300_000).nullable().optional();
const Body = z.object({ channelUrl: Field, explainer: Field, playlist: Field, channelPhoto: Field });

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const b = parsed.data;
  const patch: Partial<SiteLinks> = {};
  const set = <K extends keyof SiteLinks>(key: K, raw: string | null | undefined, parse: (s: string) => string | null, code: string) => {
    if (raw === undefined) return null;
    if (raw === null || raw.trim() === "") return void (patch[key] = null);
    const v = parse(raw);
    if (!v) return code;
    patch[key] = v as SiteLinks[K];
    return null;
  };
  const err =
    set("channelUrl", b.channelUrl, parseChannelUrl, "invalid_channel") ??
    set("explainerId", b.explainer, parseYouTubeId, "invalid_video") ??
    set("playlistId", b.playlist, parsePlaylistId, "invalid_playlist") ??
    set("channelPhoto", b.channelPhoto, checkChannelPhoto, "invalid_photo");
  if (err) return jsonError(400, err, "Invalid link");
  await saveSiteLinks(patch);
  return NextResponse.json({ links: await getSiteLinks(), clicks: await channelClicks() });
}
