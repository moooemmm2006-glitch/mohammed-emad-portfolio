import { describe, expect, it } from "vitest";
import { GRAMMAR_LEVELS, grammarLessonById, grammarLessonCounts, grammarLessons } from "../src/lib/grammar/course";
describe("four-level grammar course",()=>{
 it("contains exactly A1 through B2 and preserves the authored lesson set",()=>{expect(GRAMMAR_LEVELS).toEqual(["A1","A2","B1","B2"]);expect(grammarLessonCounts()).toEqual({A1:10,A2:9,B1:10,B2:12});});
 it("gives every lesson explanations, examples, practice, and valid same-level relations",()=>{
  const ids=new Set<string>();
  for(const level of GRAMMAR_LEVELS){for(const lesson of grammarLessons(level)){expect(ids.has(lesson.id)).toBe(false);ids.add(lesson.id);expect(lesson.level).toBe(level);expect(lesson.explanationAr.length).toBeGreaterThan(60);expect(lesson.examples.length).toBeGreaterThan(0);expect(lesson.exercises.length).toBeGreaterThan(0);for(const related of lesson.related)expect(grammarLessonById(related),`${lesson.id} -> ${related}`).toBeDefined();}}
 });
});
