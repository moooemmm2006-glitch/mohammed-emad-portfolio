/** Egyptian phone helpers. */

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = AR_DIGITS.indexOf(d);
    return String(i >= 0 ? i : FA_DIGITS.indexOf(d));
  });
}

/**
 * Normalise to the local form: 01xxxxxxxxx (mobile) or 0x… (landline).
 * Returns "" when it is not an Egyptian number.
 */
export function normalizeEgPhone(raw: string): string {
  let d = toLatinDigits(raw || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length >= 11) d = d.slice(2);
  if (!d.startsWith("0")) d = "0" + d;
  if (/^01[0125]\d{8}$/.test(d)) return d;
  // Landlines: Cairo/Giza 02 + 8 digits, other governorates 0xx + 7 digits; hotlines 19xxx.
  if (/^02\d{8}$/.test(d) || /^0(3|4\d|5\d|6\d|8\d|9\d)\d{7}$/.test(d)) return d;
  return "";
}

export function isEgMobile(raw: string): boolean {
  return /^01[0125]\d{8}$/.test(normalizeEgPhone(raw));
}

/** International form for wa.me / tel: 2010xxxxxxxx. */
export function toIntl(raw: string): string {
  const n = normalizeEgPhone(raw);
  if (n) return "20" + n.slice(1);
  const d = toLatinDigits(raw || "").replace(/\D/g, "");
  return d.length >= 8 ? d : "";
}

/** "010 1234 5678" for display. */
export function displayPhone(raw: string): string {
  const n = normalizeEgPhone(raw);
  if (/^01\d{9}$/.test(n)) return `${n.slice(0, 3)} ${n.slice(3, 7)} ${n.slice(7)}`;
  return n || (raw || "").trim();
}

export function waLink(number: string, text?: string): string {
  const n = toIntl(number);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** All phone-looking runs in a text (mobile, +20, landline). */
export function findPhones(text: string): string[] {
  const t = toLatinDigits(text);
  const out: string[] = [];
  const re = /(?:\+|00)?\d[\d\s\-().]{7,18}\d/g;
  for (const m of t.match(re) || []) {
    const n = normalizeEgPhone(m);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}
