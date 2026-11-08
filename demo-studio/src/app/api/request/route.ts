import { NextResponse, after } from "next/server";
import { z } from "zod";
import { sha256 } from "@/lib/auth";
import { buildContent } from "@/lib/demo/defaults";
import { NICHE_LABEL, NICHES } from "@/lib/demo/model";
import { expiryFrom } from "@/lib/expiry";
import { OWNER, siteUrl } from "@/lib/owner";
import { isEgMobile, normalizeEgPhone } from "@/lib/phone";
import { guessNiche } from "@/lib/quickPaste";
import { createDemo, freeSlug, getSettings, rateLimit } from "@/lib/repo";
import { clientIp, jsonError } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { sendTelegram } from "@/lib/telegram";
import { zodMessage } from "@/lib/validate";

/** Public "request a free demo" form on the portfolio → a draft in the studio with status "طلب جديد". */
const Body = z.object({
  name: z.string().trim().min(1, "اكتب اسم البيزنس").max(80),
  niche: z.enum([...NICHES, "other"]),
  phone: z.string().trim().min(8, "اكتب رقم الموبايل").max(20),
  area: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(600).default(""),
  website: z.string().max(200).optional(), // honeypot
});

const ALLOWED = [OWNER.portfolioUrl, "http://localhost:3000", "http://localhost:5500", "http://127.0.0.1:5500"];
function cors(req: Request, res: NextResponse) {
  const origin = req.headers.get("origin") || "";
  if (ALLOWED.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export async function OPTIONS(req: Request) {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  return cors(req, res);
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return cors(req, jsonError(zodMessage(parsed.error)));
  const b = parsed.data;
  // Bots fill the hidden field: pretend it worked.
  if (b.website) return cors(req, NextResponse.json({ ok: true }));
  if (!isEgMobile(b.phone)) return cors(req, jsonError("اكتب رقم موبايل مصري صحيح (11 رقم يبدأ بـ 01)."));
  const ipKey = (await sha256(`req:${await clientIp()}`)).slice(0, 24);
  const limit = await rateLimit(`request:${ipKey}`, 3, 24 * 3600_000);
  if (!limit.ok) return cors(req, jsonError("وصلت لأقصى عدد طلبات النهارده. كلّمني على واتساب مباشرة 🙏", 429));

  const phone = normalizeEgPhone(b.phone);
  const niche = b.niche === "other" ? guessNiche(`${b.name} ${b.notes}`) || "shop" : b.niche;
  const slug = await freeSlug(slugify(b.name));
  const settings = await getSettings();
  const content = buildContent({ niche, name: b.name, area: b.area, phone, whatsapp: phone }, slug);
  const note = [`📥 طلب من البورتفوليو`, `الموبايل: ${phone}`, b.niche === "other" ? "النوع: حاجة تانية" : "", b.notes && `ملاحظات: ${b.notes}`].filter(Boolean).join("\n");
  const demo = await createDemo({ content, slug, status: "request", note, source: "portfolio", expiresAt: expiryFrom(Date.now(), settings.defaultExpiryDays) });
  after(() => sendTelegram(`📥 طلب نموذج جديد من البورتفوليو\n${b.name} — ${b.niche === "other" ? "حاجة تانية" : NICHE_LABEL[niche]}${b.area ? ` — ${b.area}` : ""}\n📱 ${phone}${b.notes ? `\n📝 ${b.notes}` : ""}\n${siteUrl()}/studio/demos/${demo.id}`));
  return cors(req, NextResponse.json({ ok: true }));
}
