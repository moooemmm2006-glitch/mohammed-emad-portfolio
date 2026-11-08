/** Pure helpers for tracking (unit-tested). */

export const ALERT_THROTTLE_MS = 30 * 60_000;
export const EVENT_TYPES = ["cta_contact", "cta_portfolio", "cta_call", "cta_whatsapp", "form_submit", "map_open", "bar_dismiss"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Calendar day in Cairo (UTC+2/+3) — the dedupe window for unique visits. */
export function cairoDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

export function shouldAlert(lastSentAt: number | null | undefined, now: number, throttleMs = ALERT_THROTTLE_MS): boolean {
  return !lastSentAt || now - lastSentAt >= throttleMs;
}

export function mergeSections(stored: string, incoming: string[]): string[] {
  let base: string[] = [];
  try { base = JSON.parse(stored); } catch { /* ignore */ }
  const clean = incoming.filter((s) => /^[a-z-]{2,20}$/.test(s));
  return [...new Set([...base, ...clean])].slice(0, 20);
}

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|pagespeed|vercel|curl|wget|python|axios/i;
export function isBot(ua: string): boolean {
  return !ua || BOT.test(ua);
}

export function deviceLabel(device: string): string {
  return device === "mobile" ? "موبايل" : device === "tablet" ? "تابلت" : "كمبيوتر";
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function alertText(kind: "open" | "reopen" | "cta", name: string, v: { device: string; durationMs?: number; scroll?: number }): string {
  const details = [deviceLabel(v.device)];
  if (v.durationMs) details.push(`${formatDuration(v.durationMs)} دقيقة`);
  if (v.scroll) details.push(`وصل لـ ${v.scroll}%`);
  const d = `(${details.join("، ")})`;
  if (kind === "open") return `🔥 ${name} فتح النموذج دلوقتي ${d}`;
  if (kind === "reopen") return `👀 ${name} رجع فتح النموذج ${d}`;
  return `📞 ${name} ضغط «كلّمني» دلوقتي ${d} — كلّمه حالاً!`;
}

export const SECTION_LABEL: Record<string, string> = {
  hero: "الواجهة", items: "الخدمات/المواد", schedule: "الجدول", people: "الفريق", why: "ليه تختارنا", results: "أوائلنا",
  testimonials: "الآراء", "before-after": "قبل وبعد", notes: "التأمين", delivery: "التوصيل", form: "فورم الحجز",
  location: "المكان", faq: "الأسئلة", gallery: "الصور", closing: "الختام",
};

export const EVENT_LABEL: Record<string, string> = {
  open: "فتح النموذج لأول مرة 🔥", reopen: "رجع فتح النموذج 👀", cta_contact: "ضغط «كلّمني» 📞", cta_portfolio: "فتح البورتفوليو",
  cta_call: "جرّب زر الاتصال", cta_whatsapp: "جرّب زر واتساب", form_submit: "جرّب فورم الحجز 📝", map_open: "فتح الخريطة", bar_dismiss: "قفل شريط النموذج",
};

/** "Best time to call" hint from the last open. */
export function callHint(lastOpenedAt: number | null, now: number): { tone: "hot" | "warm" | "cold" | "none"; text: string } {
  if (!lastOpenedAt) return { tone: "none", text: "لسه محدش فتحه. ابعت اللينك أو اتصل الأول." };
  const m = (now - lastOpenedAt) / 60_000;
  if (m < 30) return { tone: "hot", text: `اتفتح من ${m < 2 ? "لحظات" : `${Math.round(m)} دقايق`}، كلّمه دلوقتي 📞` };
  if (m < 24 * 60) return { tone: "warm", text: "اتفتح النهارده. وقت مناسب لمكالمة أو رسالة متابعة." };
  return { tone: "cold", text: "بقاله فترة متفتحش. جرّب رسالة «متابعة بعد يومين»." };
}
