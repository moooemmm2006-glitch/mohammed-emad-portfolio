import type { Level } from "@/lib/levels";

// Original flat illustrations, one per partner, drawn in SVG.
const SKIN = { A1: "#f1c7a5", A2: "#e9b48e", B1: "#c98d68", B2: "#f3d2b8" } as const;

export function Avatar({ level, size = 64, className = "" }: { level: Level; size?: number; className?: string }) {
  const skin = SKIN[level];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
      role="img"
      aria-hidden="true"
      style={{ background: "color-mix(in oklab, var(--accent) 18%, var(--surface))" }}
    >
      {level === "A1" && (
        <>
          {/* Lena: grey-blond bun, round glasses, cardigan */}
          <path d="M18 100c2-20 16-30 32-30s30 10 32 30z" fill="var(--accent)" />
          <path d="M40 72l10 12 10-12" fill="#fff" opacity=".9" />
          <circle cx="50" cy="20" r="11" fill="#d9c7a1" />
          <ellipse cx="50" cy="46" rx="21" ry="23" fill={skin} />
          <path d="M29 44c0-17 9-25 21-25s21 8 21 25c-6-8-14-12-21-12s-15 4-21 12z" fill="#d9c7a1" />
          <circle cx="42" cy="48" r="6" fill="none" stroke="#5b4636" strokeWidth="2" />
          <circle cx="58" cy="48" r="6" fill="none" stroke="#5b4636" strokeWidth="2" />
          <path d="M48 48h4" stroke="#5b4636" strokeWidth="2" />
          <circle cx="42" cy="48" r="1.8" fill="#2d241c" />
          <circle cx="58" cy="48" r="1.8" fill="#2d241c" />
          <path d="M43 59c4 4 10 4 14 0" stroke="#9b4b3a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="37" cy="56" r="3" fill="#f29c8c" opacity=".5" />
          <circle cx="63" cy="56" r="3" fill="#f29c8c" opacity=".5" />
        </>
      )}
      {level === "A2" && (
        <>
          {/* Jonas: curly dark hair, hoodie, big grin */}
          <path d="M16 100c3-21 17-30 34-30s31 9 34 30z" fill="var(--accent)" />
          <path d="M38 70c3 8 21 8 24 0" fill="none" stroke="#fff" strokeWidth="3" opacity=".8" />
          <ellipse cx="50" cy="47" rx="20" ry="22" fill={skin} />
          <g fill="#3a2a20">
            <circle cx="34" cy="32" r="8" />
            <circle cx="43" cy="25" r="9" />
            <circle cx="55" cy="24" r="9" />
            <circle cx="65" cy="31" r="8" />
            <circle cx="31" cy="41" r="5" />
            <circle cx="69" cy="41" r="5" />
          </g>
          <circle cx="42" cy="48" r="2.2" fill="#2a1d14" />
          <circle cx="58" cy="48" r="2.2" fill="#2a1d14" />
          <path d="M40 43l5-1M55 42l5 1" stroke="#3a2a20" strokeWidth="2" strokeLinecap="round" />
          <path d="M41 57c5 6 13 6 18 0z" fill="#fff" stroke="#8a3d2c" strokeWidth="1.5" strokeLinejoin="round" />
        </>
      )}
      {level === "B1" && (
        <>
          {/* Mira: long dark hair, lanyard badge, calm smile */}
          <path d="M28 40c0-18 10-26 22-26s22 8 22 26v38H28z" fill="#24170f" />
          <path d="M16 100c3-20 17-29 34-29s31 9 34 29z" fill="var(--accent)" />
          <path d="M44 72l6 14 6-14" stroke="#fff" strokeWidth="2" fill="none" opacity=".85" />
          <rect x="45" y="86" width="10" height="8" rx="1.5" fill="#fff" />
          <ellipse cx="50" cy="47" rx="19" ry="22" fill={skin} />
          <path d="M31 42c4-13 11-18 19-18s16 5 19 18c-8-5-14-12-19-12-4 6-11 10-19 12z" fill="#24170f" />
          <circle cx="43" cy="49" r="2" fill="#1d130c" />
          <circle cx="57" cy="49" r="2" fill="#1d130c" />
          <path d="M44 58c3 3 9 3 12 0" stroke="#7d2f2a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx="31" cy="52" r="2" fill="var(--gold)" />
          <circle cx="69" cy="52" r="2" fill="var(--gold)" />
        </>
      )}
      {level === "B2" && (
        <>
          {/* Tobias: short side-parted hair, beard, square glasses, blazer and tie */}
          <path d="M14 100c3-21 18-30 36-30s33 9 36 30z" fill="#2b3245" />
          <path d="M42 70l8 10 8-10 2 30H40z" fill="#fff" />
          <path d="M48 78h4l2 18-4 4-4-4z" fill="var(--accent)" />
          <ellipse cx="50" cy="46" rx="20" ry="23" fill={skin} />
          <path d="M30 40c0-14 9-21 20-21 12 0 21 7 21 19-9-1-20-5-27-11-3 6-8 10-14 13z" fill="#6b5a4a" />
          <path d="M31 50c1 14 9 20 19 20s18-6 19-20c-3 5-6 6-8 6H39c-2 0-5-1-8-6z" fill="#6b5a4a" opacity=".85" />
          <rect x="35" y="43" width="12" height="9" rx="2" fill="none" stroke="#1b1d24" strokeWidth="2" />
          <rect x="53" y="43" width="12" height="9" rx="2" fill="none" stroke="#1b1d24" strokeWidth="2" />
          <path d="M47 47h6" stroke="#1b1d24" strokeWidth="2" />
          <circle cx="41" cy="47.5" r="1.8" fill="#1b1d24" />
          <circle cx="59" cy="47.5" r="1.8" fill="#1b1d24" />
          <path d="M44 60c4 2 8 2 12 0" stroke="#f3d2b8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
