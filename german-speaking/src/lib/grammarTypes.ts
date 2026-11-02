import type { Level } from "./levels";
import type { MindMap } from "./grammarMap";

export type GrammarExerciseKind = "choice" | "text" | "order" | "correction" | "translation" | "writing";
export interface GrammarExercise {
  kind: GrammarExerciseKind;
  promptAr: string;
  promptDe?: string;
  choices?: string[];
  answer?: string;
  alternatives?: string[];
  sample?: string;
  explanationAr: string;
}
export interface GrammarExample {
  de: string;
  ar: string;
  focus: string;
  why: string;
}
export interface GrammarLesson {
  id: string;
  level: Level;
  order: number;
  titleDe: string;
  titleAr: string;
  category: string;
  categoryAr: string;
  summaryIntroAr: string;
  coverage: string[];
  explanationAr: string;
  useAr: string;
  formAr: string;
  tables: { titleAr: string; headers: string[]; rows: string[][] }[];
  examples: GrammarExample[];
  mistakes: { wrong: string; right: string; reasonAr: string; avoidAr: string }[];
  exercises: GrammarExercise[];
  summaryAr: string[];
  related: string[];
  /** When present, the lesson is explained as a mind map (no text sections, no exercises). */
  map?: MindMap;
  /** The lesson's place in the course (1, 2, 3 …), shown on the card. */
  no?: number;
}
