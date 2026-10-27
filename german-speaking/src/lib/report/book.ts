import { getSentences, getTopicByNumber, relatedGrammar, type BookTopic } from "../book";
import { bestMatch, CORRECT_AT, PARTIAL_AT } from "../bookCompare";
import { recordAttempts } from "../bookProgress";
import { parseMeta, type TurnRow } from "../db/repo";

// The book part of a report for a guided conversation: which book sentences the learner said
// wrong (with the correct sentence, its Arabic meaning and the topic's grammar point).

export interface BookFix {
  said: string;
  n: number;
  de: string;
  ar: string;
  score: number;
  /** fix = close to the book sentence but not right; tip = a book answer they could have used. */
  kind: "fix" | "tip";
  grammar: { title_de: string; title_ar: string; formula: string } | null;
}

export interface BookReport {
  topic: number;
  title_de: string;
  title_ar: string;
  /** Learner sentences that matched a book sentence correctly. */
  correct: number;
  items: BookFix[];
}

export function bookReportFor(topic: BookTopic, turns: TurnRow[]): BookReport {
  const all = getSentences(topic);
  const byN = new Map(all.map((s) => [s.n, s]));
  const items: BookFix[] = [];
  let correct = 0;
  for (const t of turns) {
    if (t.role !== "user") continue;
    const meta = parseMeta(t);
    // Scripted turns already know the expected answer; AI conversations are matched against the whole topic.
    const known = meta.book ? byN.get(meta.book.n) : undefined;
    const m = known ? { item: known, score: meta.book!.score } : (() => {
      const b = bestMatch(t.text, all);
      return b ? { item: b.item, score: b.cmp.score } : null;
    })();
    if (!m) continue;
    if (m.score >= CORRECT_AT) {
      correct++;
      continue;
    }
    // Without a known expected answer, only sentences that are clearly an attempt at a book sentence count.
    if (!known && m.score < PARTIAL_AT) continue;
    const g = relatedGrammar(topic, m.item.de);
    items.push({
      said: t.text,
      n: m.item.n,
      de: m.item.de,
      ar: m.item.ar,
      score: m.score,
      kind: m.score >= PARTIAL_AT ? "fix" : "tip",
      grammar: g ? { title_de: g.title_de, title_ar: g.title_ar, formula: g.formula } : null,
    });
  }
  return { topic: topic.number, title_de: topic.title_de, title_ar: topic.title_ar, correct, items };
}

/** Build the book report and count the matched sentences in the learner's topic progress (first report only). */
export async function bookReportForSession(userId: string, bookTopic: number | null, turns: TurnRow[], firstTime: boolean): Promise<BookReport | undefined> {
  if (!bookTopic) return undefined;
  const topic = await getTopicByNumber(bookTopic);
  if (!topic) return undefined;
  const report = bookReportFor(topic, turns);
  if (firstTime) {
    const all = getSentences(topic);
    const attempts = turns
      .filter((t) => t.role === "user")
      .map((t) => {
        const meta = parseMeta(t);
        if (meta.book) return { n: meta.book.n, score: meta.book.score };
        const b = bestMatch(t.text, all);
        return b && b.cmp.score >= PARTIAL_AT ? { n: b.item.n, score: b.cmp.score } : null;
      })
      .filter((a): a is { n: number; score: number } => !!a && a.score >= PARTIAL_AT)
      .map((a) => ({ ...a, topic: topic.number }));
    await recordAttempts(userId, attempts).catch((e) => console.error("[book] progress failed:", e));
  }
  return report;
}
