import { NextResponse } from "next/server";
import { z } from "zod";
import { buildContent } from "@/lib/demo/defaults";
import { NICHES, STYLES } from "@/lib/demo/model";
import { expiryFrom } from "@/lib/expiry";
import { createDemo, freeSlug, getSettings } from "@/lib/repo";
import { requireStudio, jsonError } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { zodMessage } from "@/lib/validate";

const Row = z.object({
  name: z.string().trim().min(1, "فيه صف من غير اسم").max(80),
  niche: z.enum(NICHES),
  area: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(30).default(""),
  mapsUrl: z.string().trim().max(500).default(""),
  instagram: z.string().trim().max(200).default(""),
  notes: z.string().trim().max(1000).default(""),
});
const Body = z.object({
  rows: z.array(Row).min(1, "اختار صفوف").max(200),
  styles: z.object({ courses: z.enum(STYLES), clinic: z.enum(STYLES), shop: z.enum(STYLES) }),
});

/** Bulk create drafts with niche defaults; polish them one by one afterwards. */
export async function POST(req: Request) {
  const denied = await requireStudio();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const settings = await getSettings();
  const created: { id: string; slug: string; name: string }[] = [];
  for (const r of parsed.data.rows) {
    const slug = await freeSlug(slugify(r.name));
    const content = buildContent({
      niche: r.niche, style: parsed.data.styles[r.niche], name: r.name, area: r.area, phone: r.phone, whatsapp: r.phone,
      mapsUrl: r.mapsUrl.startsWith("http") ? r.mapsUrl : "", instagram: r.instagram,
    }, slug);
    const d = await createDemo({ content, slug, status: "draft", note: r.notes, source: "csv", expiresAt: expiryFrom(Date.now(), settings.defaultExpiryDays) });
    created.push({ id: d.id, slug: d.slug, name: d.name });
  }
  return NextResponse.json({ created });
}
