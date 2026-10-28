// The book part of a saved report of a past guided conversation: which book sentences the learner
// said wrong (with the correct sentence, its Arabic meaning and the topic's grammar point).

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
