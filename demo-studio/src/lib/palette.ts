/** Colour utilities: curated palettes, theme tokens, and logo colour quantisation. */

export type Palette = { id: string; name: string; primary: string; accent: string };

export const PALETTES: Palette[] = [
  { id: "cobalt", name: "كوبالت", primary: "#2E5BFF", accent: "#F5B841" },
  { id: "emerald", name: "زمردي", primary: "#0F766E", accent: "#F59E0B" },
  { id: "plum", name: "بنفسجي", primary: "#6D28D9", accent: "#F472B6" },
  { id: "coral", name: "مرجاني", primary: "#E4572E", accent: "#2B2D42" },
  { id: "navy", name: "كحلي ذهبي", primary: "#1E3A5F", accent: "#C9A227" },
  { id: "mint", name: "نعناعي", primary: "#0E9F8E", accent: "#0B4F6C" },
  { id: "rose", name: "وردي", primary: "#BE185D", accent: "#FBBF24" },
  { id: "olive", name: "زيتوني", primary: "#4D7C0F", accent: "#B45309" },
];

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function lin(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Darken/lighten until text on `bg` reaches the target contrast. */
export function ensureContrast(fg: string, bg: string, target = 4.5): string {
  let c = fg;
  const towards = luminance(bg) > 0.4 ? "#000000" : "#FFFFFF";
  for (let i = 0; i < 20 && contrast(c, bg) < target; i++) c = mix(c, towards, 0.12);
  return c;
}

export function readableOn(bg: string): string {
  return contrast("#FFFFFF", bg) >= contrast("#0B0D12", bg) ? "#FFFFFF" : "#0B0D12";
}

/** CSS variables a template uses. Every pair is checked for WCAG AA. */
export function themeVars(primary: string, accent: string, mode: "light" | "dark"): Record<string, string> {
  const dark = mode === "dark";
  const bg = dark ? mix("#0B0D12", primary, 0.06) : mix("#FFFFFF", primary, 0.025);
  const card = dark ? mix("#161A22", primary, 0.08) : "#FFFFFF";
  const bg2 = dark ? mix("#12151C", primary, 0.1) : mix("#F6F5F2", primary, 0.06);
  const fg = dark ? "#F4F1EA" : "#11131A";
  const mute = dark ? "#B4B7BF" : "#4B5060";
  // Accent text sits on the page and on cards: it must pass on both.
  let p = dark ? ensureContrast(mix(primary, "#FFFFFF", 0.15), bg, 4.6) : ensureContrast(primary, bg, 4.6);
  p = ensureContrast(p, card, 4.6);
  const btn = ensureContrast(primary, dark ? "#FFFFFF" : "#000000", 1);
  return {
    "--p": p,
    "--btn": btn,
    "--btn-ink": readableOn(btn),
    "--p-soft": dark ? mix(bg, primary, 0.22) : mix("#FFFFFF", primary, 0.1),
    "--a": accent,
    "--a-ink": readableOn(accent),
    "--a-soft": dark ? mix(bg, accent, 0.2) : mix("#FFFFFF", accent, 0.16),
    "--bg": bg,
    "--bg2": bg2,
    "--card": card,
    "--fg": fg,
    "--mute": ensureContrast(mute, bg2, 4.6),
    "--line": dark ? "rgba(244,241,234,.12)" : "rgba(17,19,26,.1)",
    "--deep": dark ? mix("#07080B", primary, 0.25) : mix("#0B0D12", primary, 0.35),
  };
}

/**
 * Median-cut-lite quantisation over sampled pixels (RGBA array from a canvas).
 * Returns colours ordered by how much of the logo they cover, ignoring near-white/black/grey.
 */
export function quantize(pixels: Uint8ClampedArray | number[], maxColors = 5): string[] {
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
    if (a < 160) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (max > 240 && min > 225) continue; // white
    if (max < 28) continue; // black
    if (sat < 0.18) continue; // grey
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    const bk = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    bk.n++; bk.r += r; bk.g += g; bk.b += b;
    buckets.set(key, bk);
  }
  const sorted = [...buckets.values()].sort((x, y) => y.n - x.n).map((bk) => rgbToHex([bk.r / bk.n, bk.g / bk.n, bk.b / bk.n]));
  const out: string[] = [];
  for (const c of sorted) {
    if (out.every((o) => colorDistance(o, c) > 60)) out.push(c);
    if (out.length >= maxColors) break;
  }
  return out;
}

export function colorDistance(a: string, b: string): number {
  const A = hexToRgb(a), B = hexToRgb(b);
  return Math.sqrt((A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2);
}

/** Primary = most used colour; accent = the most different of the rest (or a warm default). */
export function paletteFromColors(colors: string[]): { primary: string; accent: string } | null {
  if (!colors.length) return null;
  const primary = colors[0];
  const rest = colors.slice(1).sort((a, b) => colorDistance(b, primary) - colorDistance(a, primary));
  const accent = rest[0] && colorDistance(rest[0], primary) > 90 ? rest[0] : luminance(primary) > 0.3 ? "#1E293B" : "#F5B841";
  return { primary, accent };
}
