import { describe, expect, it } from "vitest";
import { buildContent, phrases, suggestTagline } from "@/lib/demo/defaults";
import { ContentSchema, NICHES } from "@/lib/demo/model";
import { BANKS } from "@/lib/demo/niches";
import { pick, pickN, rng } from "@/lib/seedRandom";

describe("seeded randomness", () => {
  it("is deterministic per seed", () => {
    const a = rng("english-dose"), b = rng("english-dose");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(pick([1, 2, 3, 4, 5], "x", "t")).toBe(pick([1, 2, 3, 4, 5], "x", "t"));
  });
  it("pickN returns distinct items", () => {
    const out = pickN([1, 2, 3, 4, 5, 6, 7], 5, "seed");
    expect(new Set(out).size).toBe(5);
  });
});

describe("phrase bank", () => {
  it("has 3–5+ variants for each slot in every niche", () => {
    for (const n of NICHES) {
      const b = BANKS[n];
      expect(b.taglines.length).toBeGreaterThanOrEqual(3);
      expect(b.heroSubs.length).toBeGreaterThanOrEqual(3);
      expect(b.whySets.length).toBeGreaterThanOrEqual(2);
      expect(b.faqPool.length).toBeGreaterThanOrEqual(5);
      expect(b.ctaMain.length).toBeGreaterThanOrEqual(3);
      expect(b.callScript.length).toBeGreaterThan(2);
    }
  });
  it("gives the same demo the same copy and different demos different copy", () => {
    const c = buildContent({ niche: "courses", name: "سنتر" }, "same-slug");
    expect(phrases(c, "same-slug").heroSub).toBe(phrases(c, "same-slug").heroSub);
    const slugs = Array.from({ length: 12 }, (_, i) => `center-${i}`);
    const combos = new Set(slugs.map((s) => {
      const content = buildContent({ niche: "courses", name: "سنتر" }, s);
      const p = phrases(content, s);
      return [content.tagline, p.heroSub, p.ctaMain, content.faq.map((f) => f.q).join("|")].join("#");
    }));
    expect(combos.size).toBeGreaterThan(8);
  });
  it("suggests the next tagline variant", () => {
    const a = suggestTagline("clinic", "s", { offset: 0 }), b = suggestTagline("clinic", "s", { offset: 1 });
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/\{/);
  });
  it("builds valid content for every niche without inventing prices", () => {
    for (const n of NICHES) {
      const c = buildContent({ niche: n, name: "اختبار" }, `t-${n}`);
      expect(ContentSchema.safeParse(c).success).toBe(true);
      expect(c.services.every((s) => s.price === "")).toBe(true);
    }
  });
});
