import { z } from "zod";

/** One data model for every niche. Templates read only what they need. */

export const NICHES = ["courses", "clinic", "shop"] as const;
export type Niche = (typeof NICHES)[number];
export const STYLES = ["bold", "calm"] as const;
export type Style = (typeof STYLES)[number];

export const NICHE_LABEL: Record<Niche, string> = {
  courses: "سنتر دروس / كورسات",
  clinic: "عيادة",
  shop: "محل / متجر إنستجرام",
};
export const NICHE_SHORT: Record<Niche, string> = { courses: "سنتر", clinic: "عيادة", shop: "متجر" };
export const STYLE_LABEL: Record<Style, string> = { bold: "Modern Bold", calm: "Calm Premium" };

export const CLINIC_TYPES = ["dental", "derma", "physio", "general"] as const;
export type ClinicType = (typeof CLINIC_TYPES)[number];
export const CLINIC_TYPE_LABEL: Record<ClinicType, string> = {
  dental: "أسنان",
  derma: "جلدية وتجميل",
  physio: "علاج طبيعي",
  general: "عيادة عامة",
};

/** Pipeline. "request" = came from the portfolio form. Archived is a separate flag. */
export const STATUSES = ["request", "draft", "sent", "opened", "interested", "won", "lost"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  request: "طلب جديد",
  draft: "مسودة",
  sent: "اتبعت",
  opened: "اتفتح 👀",
  interested: "مهتم",
  won: "اتقفل ✅",
  lost: "مش مهتم",
};
/** Statuses whose demo page is public. */
export const PUBLIC_STATUSES: Status[] = ["sent", "opened", "interested", "won", "lost"];

/** Egyptian week: index 0 = Saturday. */
export const DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

const text = (max: number) => z.string().trim().max(max).default("");
const id = z.string().min(1).max(40);

export const HourSchema = z.object({ open: z.boolean(), from: z.string().regex(/^\d{2}:\d{2}$/), to: z.string().regex(/^\d{2}:\d{2}$/) });
export const ServiceSchema = z.object({ id, title: z.string().trim().min(1).max(120), desc: text(400), price: text(40), tag: text(60), image: text(500) });
export const SessionSchema = z.object({ id, day: text(30), time: text(40), subject: text(80), teacher: text(80) });
export const PersonSchema = z.object({ id, name: z.string().trim().min(1).max(80), role: text(100), bio: text(400) });
export const FaqSchema = z.object({ id, q: z.string().trim().min(1).max(200), a: text(800) });
export const PointSchema = z.object({ id, t: z.string().trim().min(1).max(80), d: text(240) });

export const BrandSchema = z.object({
  logo: text(500),
  paletteId: text(40),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2E5BFF"),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#F5B841"),
  font: z.enum(["cairo-tajawal", "readex-plex", "plex", "tajawal-cairo"]).default("cairo-tajawal"),
  mode: z.enum(["light", "dark"]).default("light"),
});
export type Brand = z.infer<typeof BrandSchema>;

export const ContentSchema = z.object({
  niche: z.enum(NICHES),
  style: z.enum(STYLES),
  clinicType: z.enum(CLINIC_TYPES).default("dental"),
  name: z.string().trim().min(1, "اكتب اسم البيزنس").max(80),
  nameEn: text(80),
  tagline: text(140),
  intro: text(400),
  phone: text(30),
  whatsapp: text(30),
  area: text(80),
  address: text(200),
  mapsUrl: text(500),
  hours: z.array(HourSchema).length(7),
  services: z.array(ServiceSchema).max(40).default([]),
  schedule: z.array(SessionSchema).max(40).default([]),
  seats: text(80),
  people: z.array(PersonSchema).max(12).default([]),
  why: z.array(PointSchema).max(6).default([]),
  faq: z.array(FaqSchema).max(16).default([]),
  insurance: text(400),
  delivery: text(400),
  returns: text(600),
  instagram: text(200),
  brand: BrandSchema,
  photos: z.array(z.string().max(500)).max(8).default([]),
});
export type DemoContent = z.infer<typeof ContentSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Hour = z.infer<typeof HourSchema>;

/** What a template renders: content + data that comes from the row, not the editor. */
export type RenderMode = "demo" | "site" | "preview" | "export";
export type RenderInput = {
  content: DemoContent;
  slug: string;
  mode: RenderMode;
};

export function defaultHours(): Hour[] {
  return DAYS.map((_, i) => ({ open: i !== 6, from: "10:00", to: "22:00" }));
}

let counter = 0;
export function uid(prefix = "x"): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Parse stored JSON safely (old rows get defaults filled in). */
export function parseContent(json: string): DemoContent {
  return ContentSchema.parse(JSON.parse(json));
}

/** Sanitize a user-supplied URL: only http(s), otherwise empty. */
export function safeUrl(u: string | undefined | null): string {
  const v = (u || "").trim();
  if (!v) return "";
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}
