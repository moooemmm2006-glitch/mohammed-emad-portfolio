"use client";

import { useEffect, useId, useState } from "react";
import { fill, type TKey } from "@/lib/client/i18n";
import { useFx } from "@/lib/client/motion";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, LEVELS, type Level } from "@/lib/levels";

// The level emblem: a glossy disc with the level and its German name, a ring that fills with the
// learner's real progress on this level (milestones at 25/50/75 %), the A1 → B2 journey as four dots,
// and a short motivating line. Pure SVG: sharp on every screen, no WebGL.

const GERMAN_NAME: Record<Level, string> = { A1: "Anfänger", A2: "Grundstufe", B1: "Mittelstufe", B2: "Obere Mittelstufe" };
const R = 86;
const C = 2 * Math.PI * R;

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
  const { fx } = useFx();
  const uid = useId().replace(/:/g, "");
  const accent = LEVEL_CONFIG[level].accent;
  const value = Math.max(0, Math.min(100, progress ?? 0));
  // The ring fills from 0 once the page is shown (instantly when motion is off: no CSS transition then).
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const step = LEVELS.indexOf(level);
  const done = value >= 100;

  return (
    <figure className="level-emblem mx-auto sm:mx-0 shrink-0 flex flex-col items-center gap-2" data-fx={fx}>
      <svg
        viewBox="0 0 200 200"
        className="level-emblem-svg w-32 h-32 sm:w-[176px] sm:h-[176px] overflow-visible"
        role="img"
        aria-label={`${fill(t("badge_alt"), { l: level })} · ${GERMAN_NAME[level]} · ${value}%`}
      >
        <defs>
          <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={`color-mix(in oklab, ${accent} 55%, white)`} />
            <stop offset="55%" stopColor={accent} />
            <stop offset="100%" stopColor={`color-mix(in oklab, ${accent} 70%, black)`} />
          </linearGradient>
          <radialGradient id={`disc-${uid}`} cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor={`color-mix(in oklab, ${accent} 62%, white)`} />
            <stop offset="45%" stopColor={accent} />
            <stop offset="100%" stopColor={`color-mix(in oklab, ${accent} 55%, black)`} />
          </radialGradient>
          <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.45" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`clip-${uid}`}>
            <circle cx="100" cy="100" r="70" />
          </clipPath>
        </defs>

        {/* soft glow + ring track */}
        <circle cx="100" cy="100" r="96" fill={`color-mix(in oklab, ${accent} 10%, transparent)`} />
        <circle cx="100" cy="100" r={R} fill="none" stroke={`color-mix(in oklab, ${accent} 18%, transparent)`} strokeWidth="9" />
        {/* progress ring */}
        <circle
          className="level-emblem-ring"
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={`url(#ring-${uid})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - shown / 100)}
          transform="rotate(-90 100 100)"
        />
        {/* milestones 25 / 50 / 75 % */}
        {[25, 50, 75].map((m) => {
          const a = (m / 100) * 2 * Math.PI - Math.PI / 2;
          const reached = value >= m;
          return <circle key={m} cx={100 + R * Math.cos(a)} cy={100 + R * Math.sin(a)} r="5" fill={reached ? "white" : `color-mix(in oklab, ${accent} 30%, white)`} stroke={accent} strokeWidth="2" />;
        })}

        {/* the disc */}
        <circle cx="100" cy="100" r="72" fill={`url(#disc-${uid})`} />
        <circle cx="100" cy="100" r="64" fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="1.5" />
        <g clipPath={`url(#clip-${uid})`}>
          <ellipse cx="100" cy="58" rx="62" ry="34" fill={`url(#gloss-${uid})`} />
          <rect className="level-emblem-shine" x="-60" y="20" width="26" height="160" fill="white" opacity="0.18" transform="rotate(20 100 100)" />
        </g>

        <text x="100" y="104" textAnchor="middle" className="de" fill="white" fontSize="54" fontWeight="800" letterSpacing="1" style={{ paintOrder: "stroke" }} stroke="rgba(0,0,0,0.12)" strokeWidth="2">
          {level}
        </text>
        <text x="100" y="126" textAnchor="middle" className="de" fill="white" fillOpacity="0.9" fontSize={GERMAN_NAME[level].length > 12 ? 8.5 : 11} fontWeight="700" letterSpacing="1.4">
          {GERMAN_NAME[level].toUpperCase()}
        </text>

        {/* the journey A1 → B2 */}
        <g direction="ltr">
          {LEVELS.map((l, i) => (
            <circle key={l} cx={82 + i * 12} cy="146" r={i === step ? 4.2 : 3} fill={i <= step ? "white" : "none"} fillOpacity={i < step ? 0.6 : 1} stroke="white" strokeOpacity={i <= step ? 1 : 0.6} strokeWidth="1.3" />
          ))}
        </g>

        {done && (
          <text x="160" y="46" fontSize="28" textAnchor="middle" aria-hidden="true">
            🏆
          </text>
        )}
      </svg>
      <figcaption className="level-emblem-msg rounded-full px-3 py-1 text-xs sm:text-sm font-bold whitespace-nowrap" style={{ background: `color-mix(in oklab, ${accent} 14%, var(--surface))`, color: `color-mix(in oklab, ${accent} 80%, var(--ink))` }}>
        {fill(t(badgeMessage(progress)), { level })}
      </figcaption>
    </figure>
  );
}
