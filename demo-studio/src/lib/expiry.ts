export const DAY_MS = 86_400_000;
export const DEFAULT_EXPIRY_DAYS = 14;

export function expiryFrom(now: number, days: number): number {
  const d = Math.max(1, Math.min(365, Math.round(days)));
  return now + d * DAY_MS;
}

export function isExpired(expiresAt: number, now = Date.now()): boolean {
  return now >= expiresAt;
}

/** Extending a demo counts from today when it already expired, else from its current end. */
export function extendExpiry(expiresAt: number, days: number, now = Date.now()): number {
  return expiryFrom(Math.max(expiresAt, now), days);
}

export function daysLeft(expiresAt: number, now = Date.now()): number {
  return Math.ceil((expiresAt - now) / DAY_MS);
}

const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** "22 نوفمبر" in Cairo time. */
export function arDate(ms: number): string {
  const d = new Date(ms + 2 * 3600_000);
  return `${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]}`;
}

/** "من ساعتين", "من 10 دقايق" — Egyptian relative time. */
export function arAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "دلوقتي";
  const m = Math.round(s / 60);
  if (m === 1) return "من دقيقة";
  if (m === 2) return "من دقيقتين";
  if (m < 11) return `من ${m} دقايق`;
  if (m < 60) return `من ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h === 1) return "من ساعة";
  if (h === 2) return "من ساعتين";
  if (h < 11) return `من ${h} ساعات`;
  if (h < 24) return `من ${h} ساعة`;
  const d = Math.round(h / 24);
  if (d === 1) return "من يوم";
  if (d === 2) return "من يومين";
  if (d < 11) return `من ${d} أيام`;
  return `من ${d} يوم`;
}
