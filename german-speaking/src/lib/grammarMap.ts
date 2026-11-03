// 🗺️ A grammar lesson drawn as a mind map: a centre card and colored branches of small cards.
// Text marks: [x] highlights a part (prefix, ending, verb) as a chip.

export type MapColor = "green" | "amber" | "blue" | "rose" | "violet" | "teal";

export interface MapCard {
  /** The German form, e.g. "[auf]stehen" or "ich lern[e]". */
  head: string;
  /** Short Arabic meaning or rule. */
  ar: string;
  /** A German example sentence. */
  ex?: string;
  /** A handwritten-style German note ("⇒ …"). */
  note?: string;
  /** A small tag in the corner, e.g. "2 Bedeutungen". */
  tag?: string;
  /** German text a ▶ button reads aloud (when the map is given `onSay`). */
  say?: string;
  /** Spans the whole branch width (long rules). */
  wide?: boolean;
}

export interface MapBranch {
  title: string;
  titleAr: string;
  color: MapColor;
  cards: MapCard[];
}

export interface MindMap {
  /** Formula chips under the centre title, e.g. ["Präfix", "+", "Verb"]. */
  formula: string[];
  /** One key example under the centre title. */
  ex: string;
  exAr: string;
  branches: MapBranch[];
  /** Short German sentences worth repeating (bottom note card). */
  phrases?: string[];
}
