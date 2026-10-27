import type { BookSentence, BookTopic } from "./book";
import { bestMatch, CORRECT_AT, PARTIAL_AT } from "./bookCompare";

// Guided conversation without an API key: the partner asks the book's questions in order
// (section by section), compares the learner's answer with the book's answers and reacts.

export interface ScriptItem {
  /** Book number of the question (or of the sentence to translate). */
  n: number;
  section: number;
  /** What the partner says. Arabic in brackets is shown but not spoken. */
  ask: string;
  /** Book sentences that answer it (the sentences right after the question). */
  answers: BookSentence[];
  /** Other sentences of the same section — a learner may answer with one of those too. */
  related: BookSentence[];
  kind: "question" | "translate";
}

const isQuestion = (s: BookSentence) => s.de.trim().endsWith("?");
/** "Echt?", "Wirklich?" are reactions, not questions to answer. */
const isRealQuestion = (s: BookSentence) => isQuestion(s) && s.de.trim().split(/\s+/).length > 2;
/** Greetings that follow a question in the book are a new scene, not its answer. */
const GREETING = /^(herzlich willkommen|willkommen|hallo|hi|tschüss|guten (morgen|tag|abend)|auf wiedersehen)\b/i;

/** The order of the guided conversation for a topic. Sections with few questions add "how do you say…" prompts. */
export function scriptFor(topic: BookTopic): ScriptItem[] {
  const items: ScriptItem[] = [];
  for (const sec of topic.sections) {
    const ss = sec.sentences;
    const statements = ss.filter((s) => !isQuestion(s));
    const qs: ScriptItem[] = [];
    ss.forEach((s, i) => {
      if (!isRealQuestion(s)) return;
      const answers: BookSentence[] = [];
      for (let j = i + 1; j < ss.length && answers.length < 2 && !isQuestion(ss[j]) && !GREETING.test(ss[j].de); j++) answers.push(ss[j]);
      if (!answers.length) return; // a question followed by another question has no book answer
      qs.push({ n: s.n, section: sec.number, ask: s.de, answers, related: statements, kind: "question" });
    });
    if (qs.length < 2) {
      for (const s of statements.filter((x) => !qs.some((q) => q.answers.includes(x))).slice(0, 3)) {
        qs.push({ n: s.n, section: sec.number, ask: `Wie sagt man das auf Deutsch? (${s.ar})`, answers: [s], related: [], kind: "translate" });
      }
    }
    items.push(...qs);
  }
  return items;
}

export interface ScriptVerdict {
  /** Book sentence closest to what was said. */
  best: BookSentence;
  score: number;
  status: "correct" | "partial" | "other";
}

/** How the answer compares with the book (its own answers first, then the rest of the section). */
export function judgeAnswer(said: string, item: ScriptItem): ScriptVerdict {
  const own = bestMatch(said, item.answers)!;
  const other = bestMatch(said, item.related);
  const pick = other && other.cmp.score > own.cmp.score + 10 && other.cmp.score >= CORRECT_AT ? other : own;
  const score = pick.cmp.score;
  // A shorter answer made only of the book answer's words ("Ich habe Kurse besucht") is close, not unrelated.
  const precise = pick.cmp.heard >= 3 && pick.cmp.matched / pick.cmp.heard >= 0.85;
  const status = score >= CORRECT_AT ? "correct" : score >= PARTIAL_AT || precise ? "partial" : "other";
  return { best: status === "other" ? item.answers[0] : pick.item, score, status };
}

const PRAISE = ["Super!", "Genau!", "Sehr gut!", "Richtig!", "Prima!", "Toll!"];

/** The partner's reaction to an answer (German spoken, Arabic in brackets for the screen). */
export function reaction(v: ScriptVerdict, item: ScriptItem, turnIndex: number): string {
  const s = v.best;
  if (v.status === "correct") return PRAISE[turnIndex % PRAISE.length];
  if (v.status === "partial") return `Gut, fast! Ganz richtig ist: „${s.de}“ (ممكن تقولها كده: ${s.ar})`;
  return item.kind === "translate"
    ? `Man sagt: „${s.de}“ (${s.ar})`
    : `Gut. Man kann zum Beispiel sagen: „${s.de}“ (ممكن تقولها كده: ${s.ar})`;
}

export function greeting(topic: BookTopic, first: ScriptItem | undefined): string {
  const open = `Hallo! Heute sprechen wir über das Thema „${topic.title_de}“. (${topic.title_ar})`;
  return first ? `${open} ${first.ask}` : open;
}

export const CLOSING = "Das war's! Wir haben das ganze Thema geschafft. Super gemacht! (خلّصنا الموضوع كله — برافو عليك!)";

/** The next item after the last one asked (never repeats within a session). */
export function nextItem(items: ScriptItem[], lastAsked: number | null): ScriptItem | undefined {
  if (lastAsked === null) return items[0];
  const i = items.findIndex((x) => x.n === lastAsked);
  return i < 0 ? items[0] : items[i + 1];
}
