import { getTopicByNumber, relatedGrammar, sentencesByNumber, type BookSentence } from "./book";
import { compareSentence } from "./bookCompare";
import { recordAttempts, type PracticeResult } from "./bookProgress";

// Shared by the book API routes: scores are always computed on the server from what was heard.

export const topicOfSentence = (n: number) => Math.ceil(n / 100);

export interface HeardSentence {
  n: number;
  said: string;
}

/** Score what the learner said against the book, save it to their progress, return the results. */
export async function scoreAndRecord(userId: string, heard: HeardSentence[]): Promise<(PracticeResult & { grammar: { title_de: string; title_ar: string; formula: string } | null })[]> {
  const found = await sentencesByNumber(heard.map((h) => h.n));
  const out = [];
  for (const h of heard) {
    const s: (BookSentence & { topic: number }) | undefined = found.get(h.n);
    if (!s) continue;
    const cmp = compareSentence(s.de, h.said);
    const topic = await getTopicByNumber(s.topic);
    const g = topic && cmp.score < 85 ? relatedGrammar(topic, s.de) : null;
    out.push({
      n: s.n,
      topic: s.topic,
      de: s.de,
      ar: s.ar,
      said: h.said,
      score: cmp.score,
      missed: cmp.missed,
      grammar: g ? { title_de: g.title_de, title_ar: g.title_ar, formula: g.formula } : null,
    });
  }
  await recordAttempts(userId, out.map((r) => ({ n: r.n, topic: r.topic, score: r.score })));
  return out;
}
