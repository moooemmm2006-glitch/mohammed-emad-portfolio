import { describe, expect, it } from "vitest";
import { diffTracker, pickFocus, updateWeaknessTracker, type WeaknessEntry } from "@/lib/report/weakness";

const s = (n: number, counts: [string, number][]) => ({
  sessionId: `s${n}`,
  date: `2026-10-0${n}T10:00:00.000Z`,
  counts: counts.map(([tag, count]) => ({ tag, kind: (tag.startsWith("pron_") ? "pronunciation" : "grammar") as "grammar", count })),
});

describe("weakness tracker", () => {
  it("follows the Day 1 → Day 2 → Day 3 story", () => {
    // Day 1: Modalverben + sch/ch problems
    const d1 = updateWeaknessTracker([], s(1, [["modalverben", 4], ["pron_ch_sch", 2]]));
    expect(d1.map((e) => [e.tag, e.status])).toEqual(
      expect.arrayContaining([
        ["modalverben", "new"],
        ["pron_ch_sch", "new"],
      ]),
    );

    // Day 2: Modalverben much better, trennbare Verben is the new problem, ch/sch the same
    const d2 = updateWeaknessTracker(d1, s(2, [["modalverben", 1], ["trennbare_verben", 3], ["pron_ch_sch", 2]]));
    const by2 = Object.fromEntries(d2.map((e) => [e.tag, e]));
    expect(by2.modalverben.status).toBe("improving");
    expect(by2.trennbare_verben.status).toBe("new");
    expect(by2.pron_ch_sch.status).toBe("persisting");
    expect(by2.modalverben.totalCount).toBe(5);
    expect(diffTracker(d1, d2)).toEqual({ improved: ["modalverben"], regressed: [], new: ["trennbare_verben"], unresolved: ["pron_ch_sch"] });

    // Day 3: trennbare Verben gone, Modalverben gone
    const d3 = updateWeaknessTracker(d2, s(3, [["pron_ch_sch", 1]]));
    const by3 = Object.fromEntries(d3.map((e) => [e.tag, e]));
    expect(by3.trennbare_verben.status).toBe("improving");
    expect(by3.modalverben.status).toBe("improving");
    expect(by3.pron_ch_sch.status).toBe("improving"); // 1 <= 2 * 0.6? no: 1 <= 1.2 yes

    // Day 4: still gone → resolved after two absent sessions
    const d4 = updateWeaknessTracker(d3, s(4, []));
    const by4 = Object.fromEntries(d4.map((e) => [e.tag, e]));
    expect(by4.modalverben.status).toBe("resolved");
    expect(by4.trennbare_verben.status).toBe("resolved");
    expect(by4.modalverben.history.at(-1)).toMatchObject({ sessionId: "s4", count: 0, status: "resolved" });

    // Day 5: Modalverben comes back → regression
    const d5 = updateWeaknessTracker(d4, s(5, [["modalverben", 2]]));
    const mv = d5.find((e) => e.tag === "modalverben")!;
    expect(mv.status).toBe("persisting");
    expect(mv.history.at(-1)?.regressed).toBe(true);
    expect(mv.firstSeen).toBe("2026-10-01T10:00:00.000Z");
    expect(mv.lastSeen).toBe("2026-10-05T10:00:00.000Z");
    expect(diffTracker(d4, d5).regressed).toEqual(["modalverben"]);
  });

  it("keeps resolved entries untouched while absent and ignores zero counts", () => {
    const resolved: WeaknessEntry = {
      tag: "perfekt", kind: "grammar", firstSeen: "a", lastSeen: "a", status: "resolved", totalCount: 3, absentStreak: 2, history: [],
    };
    const out = updateWeaknessTracker([resolved], s(6, [["perfekt", 0]]));
    expect(out[0]).toBe(resolved);
  });

  it("caps history length", () => {
    let t: WeaknessEntry[] = [];
    for (let i = 1; i <= 30; i++) t = updateWeaknessTracker(t, { sessionId: `x${i}`, date: `d${i}`, counts: [{ tag: "artikel_genus", kind: "grammar", count: 2 }] });
    expect(t[0].history).toHaveLength(20);
    expect(t[0].totalCount).toBe(60);
  });

  it("picks an open grammar weakness as the next focus", () => {
    const t = updateWeaknessTracker(updateWeaknessTracker([], s(1, [["modalverben", 3], ["pron_r", 5]])), s(2, [["modalverben", 3], ["perfekt", 1]]));
    expect(pickFocus(t)?.tag).toBe("modalverben"); // persisting beats new; pronunciation is never a focus
  });
});
