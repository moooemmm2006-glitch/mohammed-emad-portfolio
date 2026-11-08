/** Arabic → Latin, tuned for Egyptian business names (readable, not academic). */
const MAP: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "e", "آ": "a", "ٱ": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "g", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "z", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z",
  "ع": "a", "غ": "gh", "ف": "f", "ق": "k", "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "ة": "a",
  "و": "o", "ي": "y", "ى": "a", "ئ": "e", "ؤ": "o", "ء": "", "ـ": "", "پ": "p", "چ": "ch", "ڤ": "v", "گ": "g",
};
const DIGITS: Record<string, string> = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
const DIACRITICS = /[ً-ٰٟ]/g;

/** Common words get a fixed, nicer spelling. */
const WORDS: Record<string, string> = {
  "مركز": "markaz", "سنتر": "center", "أكاديمية": "academy", "اكاديمية": "academy", "عيادة": "clinic", "عيادات": "clinics",
  "متجر": "store", "محل": "shop", "دكتور": "dr", "د": "dr", "مستر": "mr", "ميس": "miss", "الدكتور": "dr",
  "التجريبية": "demo", "التجريبي": "demo", "إنجليزي": "english", "انجليزي": "english",
};

export function transliterate(input: string): string {
  const words = input.normalize("NFKC").replace(DIACRITICS, "").trim().split(/\s+/);
  return words.map((w) => {
    const bare = w.replace(/[.,،:؛!?؟"'()]/g, "");
    if (WORDS[bare]) return WORDS[bare];
    let word = bare;
    // "ال" prefix → "el-" (Egyptian style).
    let prefix = "";
    if (/^ال[ء-ي]{2,}/.test(word)) { prefix = "el-"; word = word.slice(2); }
    let out = "";
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (DIGITS[ch]) out += DIGITS[ch];
      else if (MAP[ch] !== undefined) {
        let m = MAP[ch];
        // و / ي between consonants read as vowels.
        if (ch === "ي" && i > 0 && i < word.length - 1) m = "i";
        if (ch === "و" && i === 0) m = "w";
        out += m;
      } else out += ch;
    }
    return prefix + out;
  }).join(" ");
}

export function slugify(input: string): string {
  return transliterate(input)
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/, "") || "demo";
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
const RESERVED = new Set(["new", "studio", "api", "admin", "settings", "import", "s", "demo", "og", "mockup"]);

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s) && !RESERVED.has(s) && !s.includes("--");
}

/** First free slug: base, base-2, base-3… */
export async function uniqueSlug(base: string, taken: (s: string) => Promise<boolean> | boolean): Promise<string> {
  let root = slugify(base);
  if (!isValidSlug(root)) root = `${root}-site`.replace(/^-/, "");
  if (!(await taken(root))) return root;
  for (let i = 2; i < 500; i++) {
    const s = `${root}-${i}`;
    if (!(await taken(s))) return s;
  }
  return `${root}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Unguessable token for draft previews. */
export function randomId(len = 12): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}
