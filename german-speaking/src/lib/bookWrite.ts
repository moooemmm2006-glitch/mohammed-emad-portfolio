import type { BookSentence, BookTopic } from "./book";
import { headWord, rng } from "./bookQuiz";

// "Schreiben": compare a typed German sentence with the book (no API key needed).
// Case and punctuation don't count; ae/oe/ue/ss for ä/ö/ü/ß are accepted with a hint.

export type WordState = "ok" | "missing" | "wrong" | "extra";

export interface WrittenWord {
  /** The book's word (ok/missing/wrong) or the learner's word (extra). */
  text: string;
  state: WordState;
  /** For "wrong": what the learner typed instead. */
  typed?: string;
}

export interface WrittenComparison {
  score: number;
  words: WrittenWord[];
  correct: boolean;
  /** The learner wrote ae/oe/ue/ss instead of ä/ö/ü/ß somewhere (accepted). */
  umlautHint: boolean;
  /** A noun was written in lower case (accepted). */
  caseHint: boolean;
}

const PUNCT = /[„“"'’‚‘«»()[\]{}.,!?;:…–—\-/]/g;

const strip = (w: string) => w.replace(PUNCT, "");

/** Comparison form: lower case, no punctuation, umlauts and ß spelled out. */
export function foldWord(w: string): string {
  return strip(w).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

function edit(a: string, b: string): number {
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

export function compareWritten(expected: string, typed: string): WrittenComparison {
  const exp = expected.split(/\s+/).filter((w) => strip(w));
  const got = typed.split(/\s+/).filter((w) => strip(w));
  const ef = exp.map(foldWord);
  const gf = got.map(foldWord);

  // Longest common subsequence on the folded words.
  const L = Array.from({ length: ef.length + 1 }, () => new Array<number>(gf.length + 1).fill(0));
  for (let i = ef.length - 1; i >= 0; i--) for (let j = gf.length - 1; j >= 0; j--) L[i][j] = ef[i] === gf[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);

  const words: WrittenWord[] = [];
  let umlautHint = false;
  let caseHint = false;
  let i = 0;
  let j = 0;
  const pendingExp: number[] = [];
  const pendingGot: number[] = [];
  // Unmatched words between two matches: pair similar ones as "wrong" (a typo), the rest are missing/extra.
  const flush = () => {
    while (pendingExp.length && pendingGot.length) {
      const e = pendingExp.shift()!;
      const g = pendingGot.shift()!;
      if (edit(ef[e], gf[g]) <= Math.max(2, Math.floor(ef[e].length / 3))) words.push({ text: exp[e], state: "wrong", typed: got[g] });
      else {
        words.push({ text: exp[e], state: "missing" });
        words.push({ text: got[g], state: "extra" });
      }
    }
    for (const e of pendingExp.splice(0)) words.push({ text: exp[e], state: "missing" });
    for (const g of pendingGot.splice(0)) words.push({ text: got[g], state: "extra" });
  };
  while (i < ef.length || j < gf.length) {
    if (i < ef.length && j < gf.length && ef[i] === gf[j]) {
      flush();
      const e = strip(exp[i]);
      const g = strip(got[j]);
      if (/[äöüßÄÖÜ]/.test(e) && !/[äöüßÄÖÜ]/.test(g)) umlautHint = true;
      // A capitalised word inside the sentence is a noun; lower case is accepted but noted.
      if (i > 0 && /^[A-ZÄÖÜ]/.test(e) && /^[a-zäöü]/.test(g)) caseHint = true;
      words.push({ text: exp[i], state: "ok" });
      i++;
      j++;
    } else if (j >= gf.length || (i < ef.length && L[i + 1][j] >= L[i][j + 1])) {
      pendingExp.push(i++);
    } else {
      pendingGot.push(j++);
    }
  }
  flush();

  const ok = words.filter((w) => w.state === "ok").length;
  const wrong = words.filter((w) => w.state === "wrong").length;
  const extra = words.filter((w) => w.state === "extra").length;
  const raw = ef.length ? (ok + wrong * 0.5) / ef.length : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 * raw - extra * 8)));
  return { score, words, correct: ok === ef.length && extra === 0, umlautHint, caseHint };
}

// ---------- exercises ----------

export interface GapExercise {
  n: number;
  ar: string;
  /** Sentence parts; null marks a blank. */
  parts: (string | null)[];
  answers: string[];
  full: string;
}

/** Blank 1–2 of the topic's words in a sentence (or its longest words if none of them appear). */
export function makeGap(sentence: BookSentence, topic: BookTopic, maxBlanks = 2): GapExercise | null {
  const tokens = sentence.de.split(/\s+/);
  const heads = new Set(topic.vocab.map((v) => foldWord(headWord(v.de))).filter(Boolean));
  let idx = tokens.map((tk, i) => (heads.has(foldWord(tk)) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) {
    idx = tokens
      .map((tk, i) => ({ i, len: strip(tk).length }))
      .filter((x) => x.len >= 5)
      .sort((a, b) => b.len - a.len)
      .map((x) => x.i);
  }
  idx = idx.slice(0, maxBlanks).sort((a, b) => a - b);
  if (!idx.length || tokens.length < 3) return null;
  const answers: string[] = [];
  const parts: (string | null)[] = [];
  tokens.forEach((tk, i) => {
    if (idx.includes(i)) {
      const word = strip(tk);
      const before = tk.slice(0, tk.indexOf(word));
      const after = tk.slice(tk.indexOf(word) + word.length);
      if (before) parts.push(before);
      parts.push(null);
      answers.push(word);
      if (after) parts.push(after);
    } else parts.push(tk);
  });
  return { n: sentence.n, ar: sentence.ar, parts, answers, full: sentence.de };
}

/** Is a typed blank right? Same leniency as whole sentences (case, umlauts). */
export function blankOk(answer: string, typed: string): boolean {
  return foldWord(answer) === foldWord(typed.trim());
}

/** Sentences for one writing run: 3–12 words, from all sections, in a seeded random order. */
export function pickWritingSentences(topic: BookTopic, seed: number, count = 8): BookSentence[] {
  const rand = rng(seed + topic.number * 7919);
  const pool = topic.sections.flatMap((s) => s.sentences).filter((s) => {
    const n = s.de.split(/\s+/).length;
    return n >= 3 && n <= 12 && s.ar.trim();
  });
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}
