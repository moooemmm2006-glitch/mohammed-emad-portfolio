"use client";

import { useUI } from "@/lib/client/ui";
import type { Level } from "@/lib/levels";

// Original illustrated partners (no real people), one consistent flat style. Each one tells its
// level's story, and the background grows from simple (A1) to rich (B2):
//   A1 Lena   – welcoming start: notebook and a "Hallo!" bubble
//   A2 Jonas  – young Arab-German settling in: backpack, train ticket, city skyline (TV tower, cathedral)
//   B1 Mira   – confident everyday professional: headset, coffee, discussion bubbles
//   B2 Tobias – fluent and sophisticated: podium, laptop, chart and debate bubbles
// `scene` adds the background details (cards and the level page); small chat avatars stay simple.


const SKIN = { A1: "#f1c7a5", A2: "#c9966c", B1: "#b9825f", B2: "#f0cfb3" } as const;
const INK = "#2a2230";

export function Avatar({ level, size = 64, className = "", scene = false, decorative }: { level: Level; size?: number; className?: string; scene?: boolean; decorative?: boolean }) {
  const { t } = useUI();
  const skin = SKIN[level];
  const id = `av-${level}-${scene ? "s" : "p"}`;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      direction="ltr"
      style={{ direction: "ltr" }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : t(`avatar_${level}`)}
      aria-hidden={decorative ? true : undefined}
    >
      <defs>
        <clipPath id={id}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <circle cx="60" cy="60" r="60" style={{ fill: "color-mix(in oklab, var(--accent) 16%, var(--surface))" }} />

        {level === "A1" && (
          <>
            {scene && (
              <>
                <circle cx="98" cy="26" r="7" fill="#fff" opacity=".7" />
                <circle cx="106" cy="30" r="5" fill="#fff" opacity=".7" />
                <path d="M8 12h40a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H24l-7 7v-7h-9a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6z" fill="#fff" stroke="var(--accent)" strokeWidth="1.5" />
                <text x="28" y="27.5" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Inter, sans-serif" fill="var(--accent)">
                  Hallo!
                </text>
              </>
            )}
            <path d="M22 122c2-22 18-34 38-34s36 12 38 34z" fill="var(--accent)" />
            <path d="M50 88l10 12 10-12" fill="#fff" opacity=".9" />
            <rect x="54" y="74" width="12" height="12" rx="4" fill={skin} />
            <circle cx="60" cy="30" r="9" fill="#d9c7a1" />
            <ellipse cx="60" cy="56" rx="19" ry="21" fill={skin} />
            <path d="M41 54c0-17 8-25 19-25s19 8 19 25c-6-8-12-12-19-12s-13 4-19 12z" fill="#d9c7a1" />
            <circle cx="53" cy="58" r="5.5" fill="none" stroke="#5b4636" strokeWidth="1.8" />
            <circle cx="67" cy="58" r="5.5" fill="none" stroke="#5b4636" strokeWidth="1.8" />
            <path d="M58.5 58h3" stroke="#5b4636" strokeWidth="1.8" />
            <circle cx="53" cy="58" r="1.7" fill={INK} />
            <circle cx="67" cy="58" r="1.7" fill={INK} />
            <path d="M54 67c3.5 3.5 8.5 3.5 12 0" stroke="#9b4b3a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <circle cx="48" cy="65" r="2.8" fill="#f29c8c" opacity=".5" />
            <circle cx="72" cy="65" r="2.8" fill="#f29c8c" opacity=".5" />
            {/* notebook held in front */}
            <g transform="rotate(-8 60 104)">
              <rect x="44" y="94" width="32" height="22" rx="2.5" fill="#ffd166" stroke="#c8921a" strokeWidth="1.5" />
              <path d="M50 101h20M50 106h16M50 111h18" stroke="#c8921a" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="44" cy="104" r="4" fill={skin} />
              <circle cx="76" cy="104" r="4" fill={skin} />
            </g>
          </>
        )}

        {level === "A2" && (
          <>
            {scene && (
              <g style={{ fill: "color-mix(in oklab, var(--accent) 38%, var(--surface))" }}>
                {/* skyline: cathedral spires, houses, TV tower; a rail line */}
                <path d="M8 84V46l6-22 6 22v38zM20 84V46l6-22 6 22v38z" />
                <rect x="34" y="62" width="12" height="22" />
                <rect x="78" y="58" width="12" height="26" />
                <rect x="98" y="16" width="3" height="68" />
                <circle cx="99.5" cy="34" r="6" />
                <rect x="98.6" y="6" width="1.8" height="10" />
                <rect x="104" y="66" width="14" height="18" />
                <path d="M0 86h120" stroke="var(--accent)" strokeWidth="1.5" opacity=".5" />
              </g>
            )}
            <path d="M18 122c3-23 19-35 42-35s39 12 42 35z" fill="var(--accent)" />
            {/* hoodie strings and backpack straps */}
            <path d="M55 90v10M65 90v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".85" />
            <path d="M34 94c4 6 6 14 6 28M86 94c-4 6-6 14-6 28" stroke="#34404f" strokeWidth="6" strokeLinecap="round" fill="none" />
            <rect x="54" y="74" width="12" height="12" rx="4" fill={skin} />
            <ellipse cx="60" cy="56" rx="18" ry="21" fill={skin} />
            <g fill="#241a14">
              <circle cx="46" cy="42" r="7" />
              <circle cx="54" cy="36" r="8" />
              <circle cx="64" cy="35" r="8" />
              <circle cx="73" cy="41" r="7" />
              <circle cx="43" cy="50" r="4.5" />
              <circle cx="77" cy="50" r="4.5" />
            </g>
            <path d="M44 62c2 12 9 17 16 17s14-5 16-17c-3 6-9 9-16 9s-13-3-16-9z" fill="#3a2a20" opacity=".35" />
            <path d="M50 53l6-1.5M64 51.5l6 1.5" stroke="#241a14" strokeWidth="2" strokeLinecap="round" />
            <circle cx="53" cy="58" r="2" fill={INK} />
            <circle cx="67" cy="58" r="2" fill={INK} />
            <path d="M53 67c4 4.5 10 4.5 14 0z" fill="#fff" stroke="#7a3427" strokeWidth="1.4" strokeLinejoin="round" />
            {/* train ticket */}
            <g transform="rotate(10 90 102)">
              <rect x="78" y="96" width="26" height="14" rx="2" fill="#fff" stroke="var(--accent)" strokeWidth="1.5" />
              <path d="M84 101h10M84 105h6" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M97 103l3-2v4z" fill="var(--accent)" />
              <circle cx="79" cy="104" r="4" fill={skin} />
            </g>
          </>
        )}

        {level === "B1" && (
          <>
            {scene && (
              <>
                <rect x="78" y="10" width="34" height="40" rx="4" fill="#fff" opacity=".35" />
                <path d="M95 10v40M78 30h34" stroke="#fff" strokeWidth="1.5" opacity=".6" />
                <path d="M6 14h34a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6H22l-6 6v-6h-10a6 6 0 0 1-6-6v-8a6 6 0 0 1 6-6z" fill="var(--accent)" />
                <path d="M10 21h26M10 27h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <path d="M80 56h30a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5h-6v6l-6-6H80a5 5 0 0 1-5-5v-7a5 5 0 0 1 5-5z" fill="#fff" stroke="var(--accent)" strokeWidth="1.5" />
                <path d="M81 62h22M81 67h14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
            <path d="M40 50c0-18 9-27 20-27s20 9 20 27v40H40z" fill="#24170f" />
            <path d="M20 122c3-22 18-33 40-33s37 11 40 33z" fill="var(--accent)" />
            <path d="M52 90l8 14 8-14" fill="#fff" opacity=".9" />
            <rect x="54" y="74" width="12" height="12" rx="4" fill={skin} />
            <ellipse cx="60" cy="56" rx="18" ry="21" fill={skin} />
            <path d="M42 52c4-14 10-19 18-19s15 5 18 19c-7-5-13-12-18-12-4 6-10 10-18 12z" fill="#24170f" />
            <circle cx="53" cy="58" r="2" fill="#1d130c" />
            <circle cx="67" cy="58" r="2" fill="#1d130c" />
            <path d="M54 67c3 3 9 3 12 0" stroke="#7d2f2a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            {/* headset */}
            <path d="M40 56c0-16 9-26 20-26s20 10 20 26" fill="none" stroke="#3b3f4a" strokeWidth="3" />
            <rect x="36" y="52" width="7" height="12" rx="3" fill="#3b3f4a" />
            <rect x="77" y="52" width="7" height="12" rx="3" fill="#3b3f4a" />
            <path d="M40 63c2 7 6 9 12 9" fill="none" stroke="#3b3f4a" strokeWidth="2" strokeLinecap="round" />
            <circle cx="53" cy="72" r="2" fill="#3b3f4a" />
            {/* coffee cup */}
            <g>
              <path d="M78 98h16l-2 18H80z" fill="#fff" stroke="#8a6a4a" strokeWidth="1.2" />
              <rect x="79" y="103" width="14" height="6" fill="var(--accent)" opacity=".8" />
              <path d="M94 101c4 0 4 7 0 7" fill="none" stroke="#8a6a4a" strokeWidth="1.5" />
              <path d="M83 92c-1-2 1-3 0-5M89 92c-1-2 1-3 0-5" stroke="#8a6a4a" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".7" />
              <circle cx="78" cy="108" r="4" fill={skin} />
            </g>
          </>
        )}

        {level === "B2" && (
          <>
            {scene && (
              <>
                {/* chart panel, newspaper and debate bubbles */}
                <rect x="78" y="8" width="36" height="30" rx="3" fill="#fff" opacity=".85" />
                <path d="M84 32V24M91 32V18M98 32V21M105 32V13" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
                <rect x="84" y="42" width="26" height="18" rx="2" fill="#fff" opacity=".6" />
                <path d="M88 47h18M88 51h18M88 55h12" stroke="#7a7f8c" strokeWidth="1.2" />
                <path d="M6 12h22a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H18l-5 5v-5H6a5 5 0 0 1-5-5v-6a5 5 0 0 1 5-5z" fill="var(--accent)" />
                <text x="17" y="25" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily="Inter, sans-serif" fill="#fff">
                  !
                </text>
                <path d="M14 38h20a5 5 0 0 1 5 5v5a5 5 0 0 1-5 5h-4v5l-5-5H14a5 5 0 0 1-5-5v-5a5 5 0 0 1 5-5z" fill="#fff" stroke="var(--accent)" strokeWidth="1.5" />
                <text x="24" y="50" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="Inter, sans-serif" fill="var(--accent)">
                  ?
                </text>
              </>
            )}
            <path d="M18 122c3-24 20-36 42-36s39 12 42 36z" fill="#2b3245" />
            <path d="M50 86l10 11 10-11 3 34H47z" fill="#fff" />
            <path d="M57.5 94h5l2 16-4.5 4-4.5-4z" fill="var(--accent)" />
            <rect x="54" y="72" width="12" height="13" rx="4" fill={skin} />
            <ellipse cx="60" cy="55" rx="19" ry="22" fill={skin} />
            <path d="M41 50c0-15 9-22 20-22 12 0 20 7 20 19-9-1-19-5-26-11-3 6-8 10-14 14z" fill="#6b5a4a" />
            <path d="M42 60c1 14 9 20 18 20s17-6 18-20c-3 5-6 6-8 6H50c-2 0-5-1-8-6z" fill="#6b5a4a" opacity=".85" />
            <rect x="46" y="53" width="11" height="8" rx="2" fill="none" stroke={INK} strokeWidth="1.8" />
            <rect x="63" y="53" width="11" height="8" rx="2" fill="none" stroke={INK} strokeWidth="1.8" />
            <path d="M57 57h6" stroke={INK} strokeWidth="1.8" />
            <circle cx="51.5" cy="57" r="1.7" fill={INK} />
            <circle cx="68.5" cy="57" r="1.7" fill={INK} />
            <path d="M54 68c4 2 8 2 12 0" stroke="#f3d9c4" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* podium with laptop */}
            <path d="M30 122l5-26h50l5 26z" fill="#3a4258" />
            <rect x="35" y="102" width="50" height="4" fill="var(--accent)" />
            <path d="M44 96l4-12h24l4 12z" fill="#cfd5e2" />
            <rect x="50" y="87" width="20" height="7" rx="1" fill="var(--accent)" opacity=".35" />
          </>
        )}
      </g>
    </svg>
  );
}
