import type { Level } from "../../src/lib/levels";
import type {
  MapBranch,
  MapCard,
  MapColor,
  MindMap,
} from "../../src/lib/grammarMap";
import type { GrammarLesson } from "../../src/lib/grammarTypes";

// Small builders so each lesson reads like the map it draws. All explanations and examples are
// written for this site; only the order of topics follows the course plan.

export const K = (
  head: string,
  ar: string,
  ex?: string,
  note?: string,
  tag?: string,
): MapCard => ({ head, ar, ex, note, tag });
export const B = (
  title: string,
  titleAr: string,
  color: MapColor,
  cards: MapCard[],
): MapBranch => ({ title, titleAr, color, cards });

export interface Chapter {
  key: string;
  de: string;
  ar: string;
}

export function lesson(
  level: Level,
  no: number,
  id: string,
  chapter: Chapter,
  titleDe: string,
  titleAr: string,
  map: MindMap,
): GrammarLesson {
  const examples = map.branches.flatMap((b) =>
    b.cards
      .filter((c) => c.ex)
      .map((c) => ({
        de: c.ex!.replace(/[[\]]/g, ""),
        ar: c.ar,
        focus: c.head.replace(/[[\]]/g, ""),
        why: b.titleAr,
      })),
  );
  return {
    id,
    level,
    no,
    order: no,
    titleDe,
    titleAr,
    category: chapter.key,
    categoryAr: `${chapter.ar} · ${chapter.de}`,
    summaryIntroAr: map.exAr,
    coverage: map.branches.map((b) => b.titleAr),
    explanationAr: map.branches
      .map((b) => `${b.titleAr}: ${b.cards.map((c) => c.ar).join("، ")}`)
      .join(" — "),
    useAr: "",
    formAr: map.formula.join(" "),
    tables: [],
    examples,
    mistakes: [],
    exercises: [],
    summaryAr: [],
    related: [],
    map,
  };
}

export const CH = {
  verben1: { key: "verben1", de: "Verben 1", ar: "الأفعال 1" },
  saetze: { key: "saetze", de: "Sätze und Fragen", ar: "الجمل والأسئلة" },
  nomen: {
    key: "nomen",
    de: "Pronomen, Nomen und Artikel",
    ar: "الضمائر والأسماء والأدوات",
  },
  verben2: { key: "verben2", de: "Verben 2", ar: "الأفعال 2" },
  praep1: { key: "praep1", de: "Präpositionen 1", ar: "حروف الجر 1" },
  adj1: { key: "adj1", de: "Adjektive 1", ar: "الصفات 1" },
  satz1: { key: "satz1", de: "Satzverbindungen 1", ar: "ربط الجمل 1" },
  woerter: {
    key: "woerter",
    de: "Wörter und Wortbildung",
    ar: "الكلمات وتكوينها",
  },
  verben3: { key: "verben3", de: "Verben 3", ar: "الأفعال 3" },
  nomen2: { key: "nomen2", de: "Nomen 2", ar: "الأسماء 2" },
  satz2: { key: "satz2", de: "Satzverbindungen 2", ar: "ربط الجمل 2" },
  praep2: { key: "praep2", de: "Präpositionen 2", ar: "حروف الجر 2" },
  adj2: { key: "adj2", de: "Adjektive 2", ar: "الصفات 2" },
} satisfies Record<string, Chapter>;
