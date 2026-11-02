import type { Level } from "../levels";
import type { GrammarLesson } from "../grammarTypes";
import { A1_MAP } from "../../../data/grammar-map/a1";
import { A2_MAP } from "../../../data/grammar-map/a2";
import { B1_MAP } from "../../../data/grammar-map/b1";
import { B2_LESSONS } from "../../../data/grammar/b2";
export const GRAMMAR_LEVELS: Level[] = ["A1", "A2", "B1", "B2"];
// A1–B1 are mind maps in the course order; B2 keeps its written lessons for now.
const numbered = (list: GrammarLesson[]) => list.map((l, i) => ({ ...l, order: i + 1, no: i + 1 }));
const lessons: Record<Level, GrammarLesson[]> = { A1: numbered(A1_MAP), A2: numbered(A2_MAP), B1: numbered(B1_MAP), B2: B2_LESSONS };
export function grammarLessons(level: Level) { return lessons[level]; }
export function grammarLesson(level: Level, id: string) { return lessons[level].find((item) => item.id === id); }
export function grammarLessonCounts() { return Object.fromEntries(GRAMMAR_LEVELS.map((level) => [level, lessons[level].length])) as Record<Level, number>; }


export function grammarLessonById(id: string) { for (const level of GRAMMAR_LEVELS) { const lesson = lessons[level].find((item) => item.id === id); if (lesson) return { level, lesson }; } return undefined; }
