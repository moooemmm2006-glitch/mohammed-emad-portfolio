import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { addProductivityItem, deleteProductivityItem, listProductivity } from "@/lib/productivity";
import { CREATORS, PRODUCTIVITY_KINDS, cleanChannelUrl, cleanHttpsUrl, parseYouTubeId } from "@/lib/productivityShared";
import { youtubeOEmbed } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: the productivity section — paste a YouTube video, a course link or the creator's channel.

async function guard() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  return null;
}

const AddBody = z.object({ creator: z.enum(CREATORS), kind: z.enum(PRODUCTIVITY_KINDS), link: z.string().min(1).max(500), title: z.string().trim().max(200).optional() });

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = AddBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const { creator, kind, link } = parsed.data;
  const title = parsed.data.title ?? "";
  if (kind === "video" || kind === "featured") {
    const id = parseYouTubeId(link);
    if (!id) return jsonError(400, "invalid_video", "Not a YouTube video link");
    const meta = await youtubeOEmbed(id);
    if (meta === "missing") return jsonError(400, "video_not_found", "YouTube doesn't know this video");
    await addProductivityItem({ creator, kind, title: title || meta?.title || "YouTube", url: `https://www.youtube.com/watch?v=${id}`, youtubeId: id });
  } else if (kind === "channel") {
    const url = cleanChannelUrl(link);
    if (!url) return jsonError(400, "invalid_channel", "Not a YouTube channel link");
    await addProductivityItem({ creator, kind, title: title || "YouTube", url, youtubeId: null });
  } else {
    const url = cleanHttpsUrl(link);
    if (!url) return jsonError(400, "invalid_link", "Not an https link");
    if (!title) return jsonError(400, "title_needed", "A course needs a title");
    await addProductivityItem({ creator, kind, title, url, youtubeId: null });
  }
  return NextResponse.json({ items: await listProductivity() });
}

const DeleteBody = z.object({ id: z.string().min(1).max(64) });

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = DeleteBody.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  if (!(await deleteProductivityItem(parsed.data.id))) return jsonError(404, "not_found", "No such item");
  return NextResponse.json({ items: await listProductivity() });
}
