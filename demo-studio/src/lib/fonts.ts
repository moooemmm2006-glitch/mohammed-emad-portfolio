import { Cairo, IBM_Plex_Sans_Arabic, Readex_Pro, Tajawal } from "next/font/google";

// Only the families a page actually uses get downloaded (preload off, CSS-only declaration).
export const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "600", "700", "800"], variable: "--f-cairo", display: "swap", preload: false });
export const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800"], variable: "--f-tajawal", display: "swap", preload: false });
export const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--f-plex", display: "swap", preload: false });
export const readex = Readex_Pro({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--f-readex", display: "swap", preload: false });

export const fontVars = [cairo.variable, tajawal.variable, plex.variable, readex.variable].join(" ");

export const FONT_PAIRS = {
  "cairo-tajawal": { label: "Cairo + Tajawal", h: "var(--f-cairo)", b: "var(--f-tajawal)" },
  "readex-plex": { label: "Readex Pro + IBM Plex", h: "var(--f-readex)", b: "var(--f-plex)" },
  plex: { label: "IBM Plex Sans Arabic", h: "var(--f-plex)", b: "var(--f-plex)" },
  "tajawal-cairo": { label: "Tajawal + Cairo", h: "var(--f-tajawal)", b: "var(--f-cairo)" },
} as const;
