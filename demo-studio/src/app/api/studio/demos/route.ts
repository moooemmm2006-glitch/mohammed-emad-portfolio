import { NextResponse } from "next/server";
import { z } from "zod";
import { buildContent } from "@/lib/demo/defaults";
import { ContentSchema, NICHES, STATUSES, STYLES } from "@/lib/demo/model";
import { toDTO } from "@/lib/dto";
import { expiryFrom } from "@/lib/expiry";
import { createDemo, freeSlug, getSettings, listDemos } from "@/lib/repo";
import { requireStudio, jsonError } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { zodMessage } from "@/lib/validate";

export async function GET() {
  const denied = await requireStudio();
  if (denied) return denied;
  const list = await listDemos();
  return NextResponse.json({ demos: list.map((d) => toDTO(d)) });
}

const Create = z.object({
  // Either a full content object (editor) or the basics (quick create / CSV); defaults fill the rest.
  content: z.unknown().optional(),
  basics: z.object({ niche: z.enum(NICHES), style: z.enum(STYLES).optional(), name: z.string().trim().min(1, "اكتب اسم البيزنس").max(80) }).passthrough().optional(),
  slug: z.string().trim().max(60).optional(),
  status: z.enum(STATUSES).optional(),
  note: z.string().trim().max(1000).optional(),
  expiryDays: z.number().int().min(1).max(365).optional(),
  source: z.string().max(20).optional(),
});

export async function POST(req: Request) {
  const denied = await requireStudio();
  if (denied) return denied;
  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { basics, slug, status, note, expiryDays, source } = parsed.data;
  const settings = await getSettings();
  let content;
  if (parsed.data.content) {
    const c = ContentSchema.safeParse(parsed.data.content);
    if (!c.success) return jsonError(zodMessage(c.error));
    content = c.data;
  } else if (basics) {
    const seedSlug = await freeSlug(slug || slugify((basics as { nameEn?: string }).nameEn || basics.name));
    try {
      content = buildContent(basics as Parameters<typeof buildContent>[0], seedSlug);
    } catch (e) {
      return jsonError(e instanceof z.ZodError ? zodMessage(e) : "البيانات ناقصة");
    }
    const demo = await createDemo({ content, slug: seedSlug, status, note, source, expiresAt: expiryFrom(Date.now(), expiryDays || settings.defaultExpiryDays) });
    return NextResponse.json({ demo: toDTO(demo) });
  } else return jsonError("البيانات ناقصة");
  const demo = await createDemo({ content, slug, status, note, source, expiresAt: expiryFrom(Date.now(), expiryDays || settings.defaultExpiryDays) });
  return NextResponse.json({ demo: toDTO(demo) });
}
