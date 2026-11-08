import { DAYS, defaultHours, type Hour, type Niche } from "./demo/model";
import { findPhones, isEgMobile, toLatinDigits } from "./phone";

/**
 * Quick paste: whatever was copied about a business (Google Maps card, Facebook "About",
 * a WhatsApp message) → the fields we recognise. Local heuristics only, no AI.
 */
export type Parsed = {
  name?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  area?: string;
  mapsUrl?: string;
  instagram?: string;
  hours?: Hour[];
  niche?: Niche;
};

// Saturday = 0 … Friday = 6
const DAY_WORDS: [RegExp, number][] = [
  [/(السبت|سبت|saturday|\bsat\b)/i, 0],
  [/(الأحد|الاحد|احد|أحد|sunday|\bsun\b)/i, 1],
  [/(الاثنين|الإثنين|اثنين|إثنين|الاتنين|monday|\bmon\b)/i, 2],
  [/(الثلاثاء|الثلاثا|التلات|ثلاثاء|tuesday|\btue\b|\btues\b)/i, 3],
  [/(الأربعاء|الاربعاء|الاربع|أربعاء|wednesday|\bwed\b)/i, 4],
  [/(الخميس|خميس|thursday|\bthu\b|\bthurs\b)/i, 5],
  [/(الجمعة|الجمعه|جمعة|friday|\bfri\b)/i, 6],
];
const DAY_RE = new RegExp(DAY_WORDS.map(([r]) => r.source).join("|"), "gi");

function dayIndex(word: string): number {
  for (const [r, i] of DAY_WORDS) if (r.test(word)) return i;
  return -1;
}

const CLOSED_RE = /(closed|مغلق|مقفول|اجازة|إجازة|أجازة|عطلة)/i;
const ALL_DAY_RE = /(open 24 hours|24 hours|24\/7|24 ساعة|٢٤ ساعة|طول اليوم)/i;
const DAILY_RE = /(يوميا|يومياً|كل يوم|كل الأيام|كل الايام|daily|every ?day)/i;

const TIME = String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|ص|م|صباحا|صباحاً|مساء|مساءً|ظهرا|ظهراً|بالليل|الصبح)?`;
const RANGE_RE = new RegExp(`${TIME}\\s*(?:–|—|-|to|until|till|لـ|ل|الى|إلى|لحد|حتى|حتي)\\s*${TIME}`, "i");

function to24(h: number, min: number, mer: string | undefined, fallbackPm: boolean): string {
  let hour = h;
  const m = (mer || "").toLowerCase();
  const pm = /pm|p\.m|م|مساء|بالليل/.test(m) && !/صباح/.test(m);
  const am = /am|a\.m|ص|صباح|الصبح/.test(m);
  if (pm && hour < 12) hour += 12;
  else if (am && hour === 12) hour = 0;
  else if (!pm && !am && fallbackPm && hour < 12) hour += 12;
  hour = Math.min(23, Math.max(0, hour));
  return `${String(hour).padStart(2, "0")}:${String(Math.min(59, min)).padStart(2, "0")}`;
}

/** "9:00 AM – 10:00 PM" → {from, to}. Times without am/pm: a closing hour ≤ opening is read as pm. */
export function parseTimeRange(line: string): { from: string; to: string } | null {
  const m = toLatinDigits(line).match(RANGE_RE);
  if (!m) return null;
  const [, h1, m1, mer1, h2, m2, mer2] = m;
  const a = Number(h1), b = Number(h2);
  if (a > 24 || b > 24) return null;
  // "9 – 10 PM": the first takes the second's meridiem only when that keeps the order sensible.
  let firstMer = mer1;
  if (!mer1 && mer2 && /pm|م|مساء/i.test(mer2) && a < b && a !== 12) firstMer = mer2;
  const from = to24(a, Number(m1 || 0), firstMer, false);
  let to = to24(b, Number(m2 || 0), mer2, false);
  if (!mer2 && !mer1 && b <= a) to = to24(b, Number(m2 || 0), undefined, true);
  return { from, to };
}

/** Day indices mentioned in a line, expanding ranges like "السبت - الخميس" / "Saturday to Thursday". */
export function parseDays(line: string): number[] {
  const matches = [...line.matchAll(DAY_RE)];
  const idx = matches.map((m) => dayIndex(m[0])).filter((i) => i >= 0);
  if (!idx.length) return DAILY_RE.test(line) ? [0, 1, 2, 3, 4, 5, 6] : [];
  let isRange = false;
  if (matches.length === 2) {
    const a = matches[0], b = matches[1];
    const between = line.slice((a.index ?? 0) + a[0].length, b.index ?? 0);
    // "ل" glued to the second day ("للخميس") also means "until".
    isRange = /(–|—|-|\bto\b|until|through|thru|إلى|الى|لحد|حتى|حتي)/i.test(between) || /^\s*لـ?\s*$/.test(between) || /^\s*$/.test(between) && /^ل/.test(b[0]);
    if (!isRange && /^\s*$/.test(between)) isRange = false;
    if (!isRange && /\sلل?$/.test(between)) isRange = true;
  }
  if (isRange) {
    const out: number[] = [];
    for (let i = idx[0]; ; i = (i + 1) % 7) {
      out.push(i);
      if (i === idx[1] || out.length > 7) break;
    }
    return out;
  }
  return [...new Set(idx)];
}

export function parseHours(text: string): Hour[] | undefined {
  const hours = defaultHours().map((h) => ({ ...h }));
  const set = new Set<number>();
  let pending: number[] = [];
  let found = false;
  const apply = (days: number[], h: Partial<Hour>) => {
    for (const d of days) {
      hours[d] = { ...hours[d], ...h } as Hour;
      set.add(d);
    }
    found = true;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = toLatinDigits(raw.trim());
    if (!line) continue;
    let days = parseDays(line);
    const range = parseTimeRange(line);
    const closed = CLOSED_RE.test(line);
    const allDay = ALL_DAY_RE.test(line);
    if (!days.length && pending.length && (range || closed || allDay)) days = pending;
    if (days.length && !range && !closed && !allDay) { pending = days; continue; }
    pending = [];
    if (!days.length && (range || allDay)) days = [0, 1, 2, 3, 4, 5, 6].filter((d) => !set.has(d));
    if (!days.length) continue;
    if (closed && !range) apply(days, { open: false });
    else if (allDay) apply(days, { open: true, from: "00:00", to: "23:59" });
    else if (range) apply(days, { open: true, from: range.from, to: range.to });
  }
  return found ? hours : undefined;
}

const AREAS = [
  "مدينة نصر", "مصر الجديدة", "المعادي", "الهرم", "فيصل", "الدقي", "المهندسين", "الزمالك", "وسط البلد", "شبرا", "حلوان", "المقطم",
  "التجمع الخامس", "التجمع", "القاهرة الجديدة", "الرحاب", "مدينتي", "الشروق", "العبور", "6 أكتوبر", "اكتوبر", "أكتوبر", "الشيخ زايد", "زايد",
  "حدائق الأهرام", "العباسية", "عين شمس", "المطرية", "الزيتون", "حدائق القبة", "السيدة زينب", "المنيل", "إمبابة", "بولاق", "المرج",
  "الإسكندرية", "اسكندرية", "سموحة", "سيدي بشر", "ميامي", "العجمي", "المنصورة", "طنطا", "الزقازيق", "دمياط", "بنها", "شبين الكوم",
  "أسيوط", "سوهاج", "المنيا", "بني سويف", "الفيوم", "الإسماعيلية", "بورسعيد", "السويس", "الغردقة", "الأقصر", "أسوان", "كفر الشيخ", "دمنهور",
  "Nasr City", "Heliopolis", "Maadi", "Dokki", "Mohandessin", "Zamalek", "New Cairo", "Sheikh Zayed", "6th of October", "Alexandria", "Mansoura", "Tanta",
];

const ADDRESS_RE = /(شارع|ش\.|ش |ميدان|برج|عمارة|عماره|الدور|بجوار|أمام|امام|خلف|تقاطع|مول|محور|مدينة|حي |منطقة|قطعة|street|st\.|\bst\b|road|\brd\b|square|tower|floor|building|mall|egypt|مصر|محافظة|القاهرة|الجيزة)/i;
const CATEGORY_RE = /(language school|school|tutoring|educational|training cent|dental|dentist|clinic|doctor|dermatolog|physiotherap|store|shop|boutique|clothing|cosmetics|سنتر|مركز|دروس|كورسات|أكاديمية|اكاديمية|عيادة|طبيب|دكتور|أسنان|اسنان|جلدية|علاج طبيعي|محل|متجر|بوتيك|ملابس)/i;

export function guessNiche(text: string): Niche | undefined {
  const t = text.toLowerCase();
  if (/(عيادة|عيادات|دكتور|د\.|طبيب|أسنان|اسنان|جلدية|علاج طبيعي|dental|dentist|clinic|doctor|derma|physio|medical)/i.test(t)) return "clinic";
  if (/(سنتر|مركز|دروس|كورس|أكاديمية|اكاديمية|تعليم|مدرس|لغات|school|academy|tutor|course|training|education|center|centre)/i.test(t)) return "courses";
  if (/(محل|متجر|بوتيك|ستور|ملابس|اكسسوار|إكسسوار|هدايا|shop|store|boutique|fashion|clothing|gifts|cosmetics|brand)/i.test(t)) return "shop";
  return undefined;
}

function cleanLine(l: string): string {
  return l.replace(/^[\s•·\-–—*>|]+/, "").replace(/\s+/g, " ").trim();
}

export function parseQuickPaste(input: string): Parsed {
  const out: Parsed = {};
  const text = (input || "").slice(0, 8000);
  if (!text.trim()) return out;

  const urls = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const u of urls) {
    if (!out.mapsUrl && /(maps\.app\.goo\.gl|goo\.gl\/maps|google\.[a-z.]+\/maps|maps\.google\.)/i.test(u)) out.mapsUrl = u;
    if (!out.instagram && /instagram\.com\//i.test(u)) out.instagram = u;
  }

  const phones = findPhones(text.replace(/https?:\/\/\S+/g, " "));
  const mobile = phones.find(isEgMobile);
  if (phones.length) out.phone = mobile || phones[0];
  if (mobile) out.whatsapp = mobile;

  out.hours = parseHours(text);

  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const isNoise = (l: string) => {
    const lat = toLatinDigits(l);
    return /https?:\/\//i.test(l)
      || findPhones(l).length > 0 && lat.replace(/[\d\s+\-()]/g, "").length < 6
      || /^[\d.,\s()★⭐]+$/.test(lat)
      || /^\d(\.\d)?\s*\(?[\d,]*\)?\s*(reviews|تقييم|مراجعة)?/i.test(lat)
      || parseDays(l).length > 0 && (parseTimeRange(l) || CLOSED_RE.test(l) || l.length < 20)
      || !!parseTimeRange(l)
      || /^(open|closed|مفتوح|مغلق|opens|closes|يفتح|يغلق|hours|مواعيد|المواعيد|ساعات العمل|website|directions|call|save|share|الاتجاهات|اتصال|حفظ|مشاركة|الموقع الإلكتروني)\b/i.test(l);
  };

  // Address: the first line that looks like one.
  const addressLine = lines.find((l) => !isNoise(l) && ADDRESS_RE.test(l) && l.length > 8 && !/^(العنوان|address)\s*[:：]?\s*$/i.test(l));
  if (addressLine) out.address = addressLine.replace(/^(العنوان|address)\s*[:：]\s*/i, "").slice(0, 200);

  const areaSrc = out.address || text;
  const area = AREAS.find((a) => areaSrc.includes(a));
  if (area) out.area = area;

  // Name: a "الاسم:" label wins, else the first meaningful line that is not a category.
  const labelled = text.match(/(?:الاسم|اسم المكان|اسم السنتر|اسم العيادة|name)\s*[:：]\s*(.+)/i);
  if (labelled) out.name = cleanLine(labelled[1]).slice(0, 80);
  else {
    const nameLine = lines.find((l) => !isNoise(l) && l !== addressLine && l.length >= 2 && l.length <= 70 && !(CATEGORY_RE.test(l) && l.split(" ").length <= 3 && !/^(سنتر|مركز|أكاديمية|اكاديمية|عيادة|محل|متجر)\s+\S/.test(l)));
    if (nameLine) out.name = nameLine.replace(/\s*[-|·]\s*(google maps|خرائط جوجل).*$/i, "");
  }

  out.niche = guessNiche(text);
  return out;
}

export function hoursSummary(hours: Hour[]): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h < 12 ? "ص" : "م";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}${m ? ":" + String(m).padStart(2, "0") : ""} ${suffix}`;
  };
  const groups: { days: number[]; label: string }[] = [];
  hours.forEach((h, i) => {
    const label = h.open ? `${fmt(h.from)} – ${fmt(h.to)}` : "مغلق";
    const last = groups[groups.length - 1];
    if (last && last.label === label && last.days[last.days.length - 1] === i - 1) last.days.push(i);
    else groups.push({ days: [i], label });
  });
  return groups.map((g) => `${g.days.length > 1 ? `${DAYS[g.days[0]]} – ${DAYS[g.days[g.days.length - 1]]}` : DAYS[g.days[0]]}: ${g.label}`).join("، ");
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "ص" : "م";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${m ? ":" + String(m).padStart(2, "0") : ""} ${suffix}`;
}
