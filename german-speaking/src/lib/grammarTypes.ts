import type { Level } from "./levels";

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
}
