import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { addVlog, deleteVlog, getSiteLinks, listVlogs, youtubeOEmbed } from "@/lib/site";
import { isOwnChannel, parseYouTubeId } from "@/lib/siteShared";
import { YOUTUBE_ID } from "@/lib/easyGermanShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: the vlogs of "☕ استراحة" (only videos of the owner's own channel).

async function guard() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  return null;
}

const AddBody = z.object({ link: z.string().min(1).max(500), title: z.string().trim().max(200).optional(), description_ar: z.string().trim().max(600).optional() });

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = AddBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const id = parseYouTubeId(parsed.data.link);
  if (!id) return jsonError(400, "invalid_video", "Not a YouTube video link");
  const meta = await youtubeOEmbed(id);
  if (meta === "missing") return jsonError(400, "video_not_found", "YouTube doesn't know this video");
  // When YouTube answers, the video must be on the owner's channel; offline the admin's word counts.
  if (meta && !isOwnChannel(meta.authorUrl, (await getSiteLinks()).channelUrl)) return jsonError(400, "not_my_channel", "This video is from another channel");
  await addVlog({ youtubeId: id, title: parsed.data.title || meta?.title || "Vlog", description_ar: parsed.data.description_ar ?? "" });
  return NextResponse.json({ vlogs: await listVlogs() });
}

const DeleteBody = z.object({ youtubeId: z.string().regex(YOUTUBE_ID) });

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = DeleteBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  if (!(await deleteVlog(parsed.data.youtubeId))) return jsonError(404, "not_found", "No such vlog");
  return NextResponse.json({ vlogs: await listVlogs() });
}
