"use client";

import { fill, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";

// The level mark: a classic, flat tile in the level's colour (like the mark on a certificate) with
// the level, a thin inner frame and its German name; under it a slim progress line and one quiet
// motivating sentence.

const GERMAN_NAME: Record<Level, string> = { A1: "Anfänger", A2: "Grundstufe", B1: "Mittelstufe", B2: "Obere Mittelstufe" };

/** Which motivating line fits this progress. */
export function badgeMessage(progress: number | null): TKey {
  if (progress == null || progress <= 0) return "badge_msg_start";
  if (progress >= 100) return "badge_msg_done";
  if (progress >= 75) return "badge_msg_high";
  if (progress >= 50) return "badge_msg_half";
  if (progress >= 25) return "badge_msg_mid";
  return "badge_msg_low";
}

export function LevelBadge({ level, progress }: { level: Level; progress: number | null }) {
  const { t } = useUI();
  const accent = LEVEL_CONFIG[level].accent;
  const value = Math.max(0, Math.min(100, Math.round(progress ?? 0)));

  return (
    <figure className="level-mark mx-auto sm:mx-0 shrink-0 w-28 sm:w-40 flex flex-col items-stretch gap-2.5" aria-label={`${fill(t("badge_alt"), { l: level })} · ${GERMAN_NAME[level]} · ${value}%`}>
      <div
        className="level-mark-tile relative aspect-square rounded-[22%] grid place-items-center text-white select-none"
        style={{ background: `linear-gradient(165deg, color-mix(in oklab, ${accent} 90%, white) 0%, ${accent} 45%, color-mix(in oklab, ${accent} 88%, black) 100%)`, boxShadow: `0 14px 28px -16px ${accent}` }}
        aria-hidden="true"
      >
        <span className="absolute inset-[7%] rounded-[17%] border border-white/35" />
        <span className="flex flex-col items-center">
          <span className="de font-extrabold leading-none tracking-tight text-[2.6rem] sm:text-[3.6rem]">{level}</span>
          <span className="mt-2 sm:mt-2.5 h-px w-6 sm:w-8 bg-white/60" />
          <span className="de mt-1.5 sm:mt-2 text-[8px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 text-center px-2 leading-tight">
            {/* long names (Obere Mittelstufe) on two neat lines */}
            {GERMAN_NAME[level].split(" ").map((w, i) => (
              <span key={i} className="block">
                {w}
              </span>
            ))}
          </span>
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: `color-mix(in oklab, ${accent} 16%, transparent)` }} aria-hidden="true">
        <div className="level-mark-bar h-full rounded-full" style={{ width: `${value}%`, background: accent }} />
      </div>
      <figcaption className="text-center text-xs sm:text-[13px] font-semibold text-muted leading-snug">{fill(t(badgeMessage(progress)), { level })}</figcaption>
    </figure>
  );
}
