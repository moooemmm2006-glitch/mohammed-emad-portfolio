import type { BookSentence, BookTopic } from "./book";

// "Lesen": comprehension quizzes generated from the book (no API key needed).
// Shared by the browser (quiz) and the tests; pure functions with a seeded random generator.

export interface MeaningQuestion {
  kind: "meaning";
  /** The German sentence; pick its Arabic meaning. */
  de: string;
  n: number;
  options: string[];
  answer: number;
}

export interface GapQuestion {
  kind: "gap";
  /** The sentence with the missing word as "____". */
  text: string;
  ar: string;
  n: number;
  options: string[];
  answer: number;
}

export type QuizQuestion = MeaningQuestion | GapQuestion;

/** Small deterministic PRNG (mulberry32), so a seed always gives the same quiz. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Correct option + 3 distractors in random order. */
function withDistractors(correct: string, pool: string[], rand: () => number): { options: string[]; answer: number } | null {
  const others = shuffle([...new Set(pool.filter((p) => p.trim() && p !== correct))], rand).slice(0, 3);
  if (others.length < 3) return null;
  const options = shuffle([correct, ...others], rand);
  return { options, answer: options.indexOf(correct) };
}

const ARTICLE = /^(der|die|das|ein|eine|sich)\s+/i;

/** The head word of a vocab entry: "der Vorname" → "Vorname", "kommen aus" → "kommen", "Hallo!" → "Hallo". */
export function headWord(vocab: string): string {
  const w = vocab.replace(ARTICLE, "").replace(/[!?.,…]/g, "").trim().split(/\s+/)[0] ?? "";
  return w.length >= 3 ? w : "";
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The sentence with `word` blanked out, or null if the word isn't in it as a whole word. */
export function blankOut(sentence: string, word: string): string | null {
  const re = new RegExp(`(^|[^\\p{L}])(${escapeRe(word)})(?=[^\\p{L}]|$)`, "iu");
  if (!re.test(sentence)) return null;
  return sentence.replace(re, (_m, pre: string) => `${pre}____`);
}

/** A quiz for one section: meaning questions from its sentences, plus gap questions with the topic's words. */
export function makeSectionQuiz(topic: BookTopic, section: number, seed: number, size = 5): QuizQuestion[] {
  const rand = rng(seed * 31 + topic.number * 1000 + section);
  const sec = topic.sections.find((s) => s.number === section);
  if (!sec) return [];
  const allAr = topic.sections.flatMap((s) => s.sentences.map((x) => x.ar));
  const heads = [...new Set(topic.vocab.map((v) => headWord(v.de)).filter(Boolean))];

  // Gap questions: sentences of this section that contain one of the topic's words.
  const gaps: GapQuestion[] = [];
  for (const s of shuffle(sec.sentences, rand)) {
    if (gaps.length >= 2) break;
    const word = heads.find((h) => blankOut(s.de, h));
    if (!word) continue;
    const text = blankOut(s.de, word)!;
    const original = s.de.match(new RegExp(escapeRe(word), "i"))![0];
    const opts = withDistractors(original, heads.filter((h) => h.toLowerCase() !== word.toLowerCase()), rand);
    if (opts) gaps.push({ kind: "gap", text, ar: s.ar, n: s.n, ...opts });
  }

  // Meaning questions fill the rest (sentences with a meaningful length first).
  const used = new Set(gaps.map((g) => g.n));
  const candidates = shuffle(
    sec.sentences.filter((s) => !used.has(s.n) && s.ar.trim()),
    rand,
  ).sort((a, b) => Number(wordsIn(b) >= 3) - Number(wordsIn(a) >= 3));
  const meanings: MeaningQuestion[] = [];
  for (const s of candidates) {
    if (meanings.length + gaps.length >= size) break;
    const opts = withDistractors(s.ar, allAr, rand);
    if (opts) meanings.push({ kind: "meaning", de: s.de, n: s.n, ...opts });
  }
  return shuffle([...meanings, ...gaps], rand);
}

const wordsIn = (s: BookSentence) => s.de.split(/\s+/).length;

/** Percentage score of answers (index per question; null = not answered). */
export function quizScore(questions: QuizQuestion[], answers: (number | null)[]): number {
  if (!questions.length) return 0;
  const right = questions.filter((q, i) => answers[i] === q.answer).length;
  return Math.round((100 * right) / questions.length);
}
