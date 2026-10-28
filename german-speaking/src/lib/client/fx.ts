// 3D effects level: "on" (full 3D), "mild" (short flat transitions, no tilt, no WebGL), "off" (fades only).

export type FxPref = "auto" | "on" | "mild" | "off";
export type Fx = "on" | "mild" | "off";

/** prefers-reduced-motion always means "off"; "auto" is "mild" on low-end phones, otherwise "on". */
export function resolveFx(pref: FxPref, reduced: boolean, lowEnd: boolean): Fx {
  if (reduced) return "off";
  if (pref !== "auto") return pref;
  return lowEnd ? "mild" : "on";
}
