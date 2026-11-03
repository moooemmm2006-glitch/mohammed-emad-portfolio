import type { BookGrammar } from "./book";
import type { MapColor, MindMap } from "./grammarMap";

// 🗺️ A topic's grammar (5–6 points from the book) drawn as one mind map: every grammar point is a
// branch with its formula + rule card and its examples (each with a ▶ button).

const COLORS: MapColor[] = ["green", "blue", "amber", "rose", "teal", "violet"];
/** The book's text has no highlight marks; keep it literal. */
const plain = (s: string) => s.replace(/\[/g, "(").replace(/\]/g, ")");

export function topicGrammarMap(
  grammar: BookGrammar[],
  topicAr: string,
): MindMap {
  return {
    formula: [],
    ex: "",
    exAr: topicAr,
    branches: grammar.map((g, i) => ({
      title: g.title_de,
      titleAr: g.title_ar,
      color: COLORS[i % COLORS.length],
      cards: [
        { head: plain(g.formula), ar: g.explanation_ar, wide: true },
        ...g.examples.map((e) => ({ head: plain(e.de), ar: e.ar, say: e.de })),
      ],
    })),
  };
}
