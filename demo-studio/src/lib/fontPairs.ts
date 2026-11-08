/** Client-safe copy of the font pair labels (no next/font import). */
export const FONT_PAIR_LABELS = {
  "cairo-tajawal": "Cairo + Tajawal",
  "readex-plex": "Readex Pro + IBM Plex",
  plex: "IBM Plex Sans Arabic",
  "tajawal-cairo": "Tajawal + Cairo",
} as const;
export const FONT_PAIR_VARS = {
  "cairo-tajawal": { h: "var(--f-cairo)", b: "var(--f-tajawal)" },
  "readex-plex": { h: "var(--f-readex)", b: "var(--f-plex)" },
  plex: { h: "var(--f-plex)", b: "var(--f-plex)" },
  "tajawal-cairo": { h: "var(--f-tajawal)", b: "var(--f-cairo)" },
} as const;
