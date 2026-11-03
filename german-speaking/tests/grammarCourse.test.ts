import { describe, expect, it } from "vitest";
import {
  GRAMMAR_LEVELS,
  grammarLessonById,
  grammarLessonCounts,
  grammarLessons,
} from "../src/lib/grammar/course";

describe("grammar course", () => {
  it("has every level as mind maps in course order", () => {
    expect(GRAMMAR_LEVELS).toEqual(["A1", "A2", "B1", "B2"]);
    expect(grammarLessonCounts()).toEqual({ A1: 30, A2: 20, B1: 35, B2: 12 });
  });

  it("gives every lesson a unique id and valid relations", () => {
    const ids = new Set<string>();
    for (const level of GRAMMAR_LEVELS) {
      grammarLessons(level).forEach((lesson, i) => {
        expect(ids.has(lesson.id), lesson.id).toBe(false);
        ids.add(lesson.id);
        expect(lesson.level).toBe(level);
        for (const related of lesson.related)
          expect(
            grammarLessonById(related),
            `${lesson.id} -> ${related}`,
          ).toBeDefined();
        expect(lesson.order).toBe(i + 1);
        expect(lesson.exercises).toEqual([]);
        expect(lesson.map, lesson.id).toBeDefined();
      });
    }
  });

  it("draws every lesson as a full mind map", () => {
    for (const level of ["A1", "A2", "B1", "B2"] as const) {
      for (const lesson of grammarLessons(level)) {
        const map = lesson.map!;
        expect(map, lesson.id).toBeDefined();
        expect(map.ex.length, lesson.id).toBeGreaterThan(5);
        expect(map.exAr.length, lesson.id).toBeGreaterThan(5);
        expect(map.branches.length, lesson.id).toBeGreaterThanOrEqual(1);
        expect(
          map.branches.flatMap((b) => b.cards).length,
          lesson.id,
        ).toBeGreaterThanOrEqual(2);
        for (const b of map.branches) {
          expect(b.cards.length, `${lesson.id} ${b.title}`).toBeGreaterThan(0);
          for (const c of b.cards) {
            expect(
              c.head.trim().length,
              `${lesson.id} ${b.title}`,
            ).toBeGreaterThan(0);
            // Highlight marks must be balanced: every "[" closes.
            for (const text of [c.head, c.ex ?? ""])
              expect(text.split("[").length, `${lesson.id}: ${text}`).toBe(
                text.split("]").length,
              );
          }
        }
      }
    }
  });
});
