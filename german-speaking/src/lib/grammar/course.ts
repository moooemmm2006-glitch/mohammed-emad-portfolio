import type { Level } from "../levels";
import type { GrammarLesson } from "../grammarTypes";
import { A1_LESSONS } from "../../../data/grammar/a1";
import { A2_LESSONS } from "../../../data/grammar/a2";
import { B1_LESSONS } from "../../../data/grammar/b1";
import { B2_LESSONS } from "../../../data/grammar/b2";
export const GRAMMAR_LEVELS: Level[] = ["A1", "A2", "B1", "B2"];
const lessons: Record<Level, GrammarLesson[]> = { A1: A1_LESSONS, A2: A2_LESSONS, B1: B1_LESSONS, B2: B2_LESSONS };
export function grammarLessons(level: Level) { return lessons[level]; }
export function grammarLesson(level: Level, id: string) { return lessons[level].find((item) => item.id === id); }
export function grammarLessonCounts() { return Object.fromEntries(GRAMMAR_LEVELS.map((level) => [level, lessons[level].length])) as Record<Level, number>; }


export function grammarLessonById(id: string) { for (const level of GRAMMAR_LEVELS) { const lesson = lessons[level].find((item) => item.id === id); if (lesson) return { level, lesson }; } return undefined; }
