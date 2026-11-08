import { NextResponse } from "next/server";
import { z } from "zod";
import { ContentSchema, safeUrl, STATUSES } from "@/lib/demo/model";
import { toDTO } from "@/lib/dto";
import { DAY_MS, extendExpiry } from "@/lib/expiry";
import { deleteDemo, demoTimeline, duplicateDemo, getDemo, getSettings, listSubmissions, slugTaken, updateDemo } from "@/lib/repo";
import { requireStudio, jsonError } from "@/lib/session";
import { isValidSlug } from "@/lib/slug";
import { zodMessage } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireStudio();
  if (denied) return denied;
  const { id } = await params;
  const d = await getDemo(id);
  if (!d) return jsonError("النموذج مش موجود", 404);
  const [timeline, subs] = await Promise.all([demoTimeline(id), listSubmissions(id)]);
  return NextResponse.json({ demo: toDTO(d), timeline, submissions: subs });
}

const Patch = z.object({
  content: z.unknown().optional(),
  slug: z.string().trim().toLowerCase().max(60).optional(),
  status: z.enum(STATUSES).optional(),
  note: z.string().trim().max(1000).optional(),
  expiresAt: z.number().int().positive().optional(),
  archived: z.boolean().optional(),
  siteLive: z.boolean().optional(),
  webhookUrl: z.string().trim().max(500).optional(),
  action: z.enum(["duplicate", "extend"]).optional(),
  days: z.number().int().min(1).max(365).optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireStudio();
  if (denied) return denied;
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const body = parsed.data;
  const current = await getDemo(id);
  if (!current) return jsonError("النموذج مش موجود", 404);

  if (body.action === "duplicate") {
    const settings = await getSettings();
    const copy = await duplicateDemo(id, Date.now() + settings.defaultExpiryDays * DAY_MS);
    return NextResponse.json({ demo: copy && toDTO(copy) });
  }
  if (body.action === "extend") {
    const settings = await getSettings();
    const d = await updateDemo(id, { expiresAt: extendExpiry(current.expiresAt, body.days || settings.defaultExpiryDays) });
    return NextResponse.json({ demo: d && toDTO(d) });
  }

  const patch: Parameters<typeof updateDemo>[1] = {};
  if (body.content !== undefined) {
    const c = ContentSchema.safeParse(body.content);
    if (!c.success) return jsonError(zodMessage(c.error));
    patch.content = c.data;
  }
  if (body.slug !== undefined && body.slug !== current.slug) {
    if (!isValidSlug(body.slug)) return jsonError("الرابط: حروف إنجليزي صغيرة وأرقام وشَرطة بس");
    if (await slugTaken(body.slug, id)) return jsonError("الرابط ده مستخدم قبل كده، اختار غيره");
    patch.slug = body.slug;
  }
  if (body.webhookUrl !== undefined) {
    const u = safeUrl(body.webhookUrl);
    if (body.webhookUrl && !u.startsWith("https://")) return jsonError("لينك الويب هوك لازم يبدأ بـ https://");
    patch.webhookUrl = u;
  }
  for (const k of ["status", "note", "expiresAt", "archived", "siteLive"] as const) {
    if (body[k] !== undefined) (patch as Record<string, unknown>)[k] = body[k];
  }
  const d = await updateDemo(id, patch);
  return NextResponse.json({ demo: d && toDTO(d) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireStudio();
  if (denied) return denied;
  const { id } = await params;
  await deleteDemo(id);
  return NextResponse.json({ ok: true });
}
