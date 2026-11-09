import { describe, expect, it } from "vitest";
import { contrast, paletteFromColors, PALETTES, quantize, themeVars } from "@/lib/palette";

describe("palette", () => {
  it("has 8 curated palettes", () => expect(PALETTES).toHaveLength(8));
  it("keeps body and accent text readable (WCAG AA) in both modes", () => {
    for (const p of PALETTES) for (const mode of ["light", "dark"] as const) {
      const v = themeVars(p.primary, p.accent, mode);
      expect(contrast(v["--p"], v["--bg"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(v["--p"], v["--card"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(v["--btn-ink"], v["--btn"])).toBeGreaterThanOrEqual(3);
      expect(contrast(v["--fg"], v["--bg"])).toBeGreaterThanOrEqual(7);
    }
  });
  it("quantises logo pixels ignoring white, black and grey", () => {
    const px: number[] = [];
    const push = (r: number, g: number, b: number, n: number) => { for (let i = 0; i < n; i++) px.push(r, g, b, 255); };
    push(255, 255, 255, 500); push(20, 20, 20, 50); push(128, 128, 128, 80); push(230, 40, 60, 200); push(30, 90, 220, 100);
    const colors = quantize(px);
    expect(colors).toHaveLength(2);
    expect(paletteFromColors(colors)!.primary).toBe(colors[0]);
  });
});
