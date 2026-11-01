import { describe, expect, it } from "vitest";
import { PLACEMENT, placementResult } from "@/lib/placement";

// 🎯 Placement test: 5 questions per level, valid answers, and the start-level rule.
describe("placement test", () => {
  it("has five well-formed questions per level", () => {
    for (const l of ["A1", "A2", "B1", "B2"]) expect(PLACEMENT.filter((q) => q.level === l)).toHaveLength(5);
    for (const q of PLACEMENT) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.why.length).toBeGreaterThan(5);
    }
  });
  it("starts at the first level with fewer than 4 of 5 right", () => {
    const right = PLACEMENT.map((q) => q.answer);
    expect(placementResult(PLACEMENT.map(() => null)).level).toBe("A1");
    expect(placementResult(right).level).toBe("B2");
    const a1Only = PLACEMENT.map((q) => (q.level === "A1" ? q.answer : -1));
    expect(placementResult(a1Only)).toMatchObject({ level: "A2", perLevel: { A1: 5, A2: 0 } });
    const upToB1 = PLACEMENT.map((q) => (q.level !== "B2" ? q.answer : -1));
    expect(placementResult(upToB1).level).toBe("B2");
  });
});
