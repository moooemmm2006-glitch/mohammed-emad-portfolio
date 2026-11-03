import type { MapBranch, MapCard, MindMap } from "../grammarMap";
import type { GrammarLesson } from "../grammarTypes";

// Turns a written grammar lesson (B2) into the same mind-map layout as A1–B1, keeping its own
// content: overview table → cards, form + use → rule cards, examples (focus highlighted),
// common mistakes (right form, with the wrong one as a note). Exercises are dropped.

const AR = /[؀-ۿ]/;
/** Book text has no highlight marks: keep brackets literal. */
const plain = (s: string) => s.replace(/\[/g, "(").replace(/\]/g, ")");

function mark(de: string, focus: string): string {
  const d = plain(de);
  const f = plain(focus).trim();
  const i = f ? d.indexOf(f) : -1;
  return i < 0 ? d : `${d.slice(0, i)}[${f}]${d.slice(i + f.length)}`;
}

function tableCards(rows: string[][]): MapCard[] {
  return rows.map((row) => {
    const ar = row.filter((c) => AR.test(c));
    const de = row.filter((c) => !AR.test(c));
    return { head: plain(de[0] ?? ar[0] ?? ""), ar: ar.join(" · "), ex: de[1] ? plain(de.slice(1).join(" · ")) : undefined };
  });
}

export function writtenToMap(l: GrammarLesson): MindMap {
  const branches: MapBranch[] = [];
  l.tables.forEach((t, i) => branches.push({ title: i ? `Überblick ${i + 1}` : "Überblick", titleAr: t.titleAr, color: "green", cards: tableCards(t.rows) }));
  branches.push({
    title: "Regel",
    titleAr: "القاعدة",
    color: "violet",
    cards: [
      ...(l.formAr ? [{ head: "Bildung", ar: l.formAr, wide: true }] : []),
      ...(l.useAr ? [{ head: "Gebrauch", ar: l.useAr, wide: true }] : []),
    ],
  });
  if (l.examples.length) branches.push({ title: "Beispiele", titleAr: "أمثلة", color: "blue", cards: l.examples.map((e) => ({ head: mark(e.de, e.focus), ar: `${e.ar} — ${e.why}` })) });
  if (l.mistakes.length) branches.push({ title: "Typische Fehler", titleAr: "أخطاء شائعة", color: "rose", cards: l.mistakes.map((m) => ({ head: plain(m.right), ar: [m.reasonAr, m.avoidAr].filter(Boolean).join(" "), note: `nicht: ${plain(m.wrong)}` })) });
  return {
    formula: l.coverage.slice(0, 3),
    ex: l.examples[0] ? plain(l.examples[0].de) : "",
    exAr: l.summaryIntroAr,
    branches: branches.filter((b) => b.cards.length),
  };
}
