// Compare what the learner said (speech recognition) with a book sentence.
// Shared by the browser (instant feedback) and the server (saved progress, reports).

export type MatchStatus = "correct" | "partial" | "wrong";

export interface WordMark {
  /** The word as written in the book (with punctuation). */
  text: string;
  /** Heard (true), missed (false), or punctuation only (null). */
  ok: boolean | null;
}

export interface Comparison {
  /** 0–100: share of the book sentence's words that were heard. */
  score: number;
  status: MatchStatus;
  words: WordMark[];
  missed: string[];
  /** How many words were heard, and how many of them belong to the book sentence (in order). */
  heard: number;
  matched: number;
}

export const CORRECT_AT = 85;
export const PARTIAL_AT = 50;

export const statusFor = (score: number): MatchStatus => (score >= CORRECT_AT ? "correct" : score >= PARTIAL_AT ? "partial" : "wrong");

const UNITS = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];

/** 0–100 as a German word, so "7" and "sieben" match. */
export function numberWord(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 100) return null;
  if (n < 20) return UNITS[n];
  if (n === 100) return "hundert";
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? TENS[t] : `${u === 1 ? "ein" : UNITS[u]}und${TENS[t]}`;
}

/** Lowercase, ß → ss, no punctuation, numbers as words. Umlauts stay (ae/oe/ue are mapped to them). */
export function normalizeWord(w: string): string {
  let s = w
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[„“"'’‚‘«»()[\]{}.,!?;:…–—\-/]/g, "");
  if (/^\d+$/.test(s)) s = numberWord(Number(s))?.replace(/ß/g, "ss") ?? s;
  return s.replace(/ae/g, "ä").replace(/oe/g, "ö").replace(/ue/g, "ü");
}

export function words(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);
}

/** Speech recognition often gets one letter wrong in long words; that still counts as heard. */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const long = Math.max(a.length, b.length);
  if (long < 5 || Math.abs(a.length - b.length) > 1) return false;
  return editDistance(a, b) <= 1;
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Word-level comparison (longest common subsequence, so the word order matters). */
export function compareSentence(expected: string, said: string): Comparison {
  const tokens = expected.split(/\s+/).filter(Boolean);
  const norm = tokens.map(normalizeWord);
  const idx = norm.map((w, i) => (w ? i : -1)).filter((i) => i >= 0);
  const exp = idx.map((i) => norm[i]);
  const got = words(said);

  // LCS table
  const L = Array.from({ length: exp.length + 1 }, () => new Array<number>(got.length + 1).fill(0));
  for (let i = exp.length - 1; i >= 0; i--) {
    for (let j = got.length - 1; j >= 0; j--) {
      L[i][j] = sameWord(exp[i], got[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const hit = new Set<number>();
  for (let i = 0, j = 0; i < exp.length && j < got.length; ) {
    if (sameWord(exp[i], got[j])) {
      hit.add(i);
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }

  const marks: WordMark[] = tokens.map((text, k) => {
    const pos = idx.indexOf(k);
    return { text, ok: pos < 0 ? null : hit.has(pos) };
  });
  // Many extra words (a different sentence that happens to share words) lower the score a bit.
  const extra = Math.max(0, got.length - exp.length - 2);
  const raw = exp.length ? hit.size / exp.length : 0;
  const score = Math.max(0, Math.round(100 * raw - extra * 5));
  return { score, status: statusFor(score), words: marks, missed: marks.filter((m) => m.ok === false).map((m) => m.text), heard: got.length, matched: hit.size };
}

/** The closest of several candidate sentences. */
export function bestMatch<T extends { de: string }>(said: string, candidates: T[]): { item: T; cmp: Comparison } | null {
  let best: { item: T; cmp: Comparison } | null = null;
  for (const c of candidates) {
    const cmp = compareSentence(c.de, said);
    if (!best || cmp.score > best.cmp.score) best = { item: c, cmp };
  }
  return best;
}
