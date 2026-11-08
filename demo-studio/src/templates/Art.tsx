import { rng } from "@/lib/seedRandom";
import type { Niche } from "@/lib/demo/model";

/**
 * Our own visuals: abstract SVG illustrations per niche, drawn in code from the demo palette.
 * No stock photos, no AI faces, no real people.
 */
export function NicheArt({
  niche, seed, primary, accent, variant = 0, className, dark = false, label,
}: { niche: Niche; seed: string; primary: string; accent: string; variant?: number; className?: string; dark?: boolean; label?: string }) {
  const s = `${seed}|art|${variant}`;
  const j = jitter(s);
  const bg1 = dark ? "#10131A" : "#FFFFFF";
  const id = `g${Math.floor(rng(s + "id")() * 1e9).toString(36)}`;
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={primary} />
          <stop offset="1" stopColor={mixHex(primary, accent, 0.45)} />
        </linearGradient>
        <radialGradient id={`${id}b`} cx=".3" cy=".25" r=".9">
          <stop offset="0" stopColor={mixHex(bg1, primary, 0.18)} />
          <stop offset="1" stopColor={mixHex(bg1, primary, 0.04)} />
        </radialGradient>
        <pattern id={`${id}d`} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill={primary} opacity=".22" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill={`url(#${id}b)`} />
      <rect x={250 + j(30)} y={18 + j(20)} width="130" height="110" fill={`url(#${id}d)`} />
      {niche === "courses" && <Courses id={id} s={s} primary={primary} accent={accent} bg={bg1} />}
      {niche === "clinic" && <Clinic id={id} s={s} primary={primary} accent={accent} bg={bg1} />}
      {niche === "shop" && <Shop id={id} s={s} primary={primary} accent={accent} bg={bg1} />}
    </svg>
  );
}

type P = { id: string; s: string; primary: string; accent: string; bg: string };

function Courses({ id, s, primary, accent, bg }: P) {
  const j = jitter(s + "Courses");
  const x = 120 + j(30);
  return (
    <g>
      <circle cx={300 + j(20)} cy={190 + j(20)} r="78" fill={accent} opacity=".9" />
      <circle cx={92 + j(16)} cy={78 + j(16)} r="34" fill="none" stroke={primary} strokeWidth="10" opacity=".35" />
      {/* stacked books */}
      <g transform={`translate(${x} ${150 + j(10)}) rotate(${-4 + j(4)})`}>
        <rect x="0" y="72" width="190" height="34" rx="8" fill={`url(#${id}a)`} />
        <rect x="14" y="40" width="170" height="30" rx="8" fill={mixHex(primary, bg, 0.35)} />
        <rect x="-6" y="8" width="160" height="30" rx="8" fill={accent} />
        <rect x="12" y="84" width="110" height="5" rx="2.5" fill={bg} opacity=".55" />
        <rect x="28" y="51" width="80" height="5" rx="2.5" fill={bg} opacity=".6" />
        <rect x="8" y="19" width="94" height="5" rx="2.5" fill={primary} opacity=".45" />
      </g>
      {/* open notebook / lines */}
      <g transform={`translate(${210 + j(12)} ${40 + j(10)}) rotate(${6 + j(4)})`}>
        <rect width="120" height="86" rx="12" fill={bg} stroke={primary} strokeOpacity=".2" />
        {[0, 1, 2, 3].map((i) => <rect key={i} x="16" y={18 + i * 16} width={i === 3 ? 50 : 88} height="5" rx="2.5" fill={primary} opacity={i === 0 ? 0.7 : 0.25} />)}
      </g>
      <path d={`M${40 + j(10)} 250 l26 -40 l26 40 z`} fill={primary} opacity=".85" />
      <rect x={348 + j(10)} y={46 + j(10)} width="22" height="22" rx="4" fill={primary} transform="rotate(20 360 57)" />
    </g>
  );
}

function Clinic({ id, s, primary, accent, bg }: P) {
  const j = jitter(s + "Clinic");
  const cx = 210 + j(30), cy = 150 + j(16);
  return (
    <g>
      {[110, 80, 52].map((rr, i) => <circle key={rr} cx={cx} cy={cy} r={rr} fill={i === 2 ? `url(#${id}a)` : "none"} stroke={primary} strokeOpacity={0.18 + i * 0.12} strokeWidth={i === 2 ? 0 : 2} />)}
      <g transform={`translate(${cx} ${cy})`}>
        <rect x="-9" y="-28" width="18" height="56" rx="6" fill={bg} />
        <rect x="-28" y="-9" width="56" height="18" rx="6" fill={bg} />
      </g>
      <path d={`M0 ${236 + j(10)} C 80 ${206 + j(20)}, 160 ${266 + j(20)}, 240 ${232 + j(10)} S 360 ${210 + j(16)}, 400 ${226 + j(10)} V300 H0z`} fill={accent} opacity=".18" />
      <path d={`M0 ${256 + j(10)} C 90 ${230 + j(16)}, 190 ${284 + j(16)}, 280 ${252 + j(10)} S 380 ${244}, 400 ${250} V300 H0z`} fill={primary} opacity=".14" />
      <circle cx={70 + j(16)} cy={70 + j(16)} r="20" fill={accent} opacity=".85" />
      <circle cx={344 + j(12)} cy={70 + j(12)} r="9" fill={primary} opacity=".6" />
      <rect x={326 + j(10)} y={168 + j(10)} width="40" height="40" rx="14" fill="none" stroke={accent} strokeWidth="6" opacity=".6" />
    </g>
  );
}

function Shop({ id, s, primary, accent, bg }: P) {
  const j = jitter(s + "Shop");
  const x = 150 + j(24), y = 92 + j(10);
  return (
    <g>
      <path d={`M${40 + j(10)} 300 V170 a70 70 0 0 1 140 0 V300z`} fill={accent} opacity=".85" />
      <path d={`M${250 + j(10)} 300 V120 a60 60 0 0 1 120 0 V300z`} fill={primary} opacity=".14" />
      {/* bag */}
      <g transform={`translate(${x} ${y}) rotate(${-5 + j(6)})`}>
        <path d="M30 40 a40 40 0 0 1 80 0" fill="none" stroke={primary} strokeWidth="9" strokeLinecap="round" />
        <rect x="0" y="36" width="140" height="132" rx="18" fill={`url(#${id}a)`} />
        <rect x="18" y="58" width="44" height="6" rx="3" fill={bg} opacity=".6" />
        <circle cx="112" cy="140" r="14" fill={accent} />
      </g>
      {/* tag */}
      <g transform={`translate(${300 + j(14)} ${190 + j(12)}) rotate(${18 + j(8)})`}>
        <path d="M0 0 h56 l18 20 l-18 20 h-56z" fill={bg} stroke={primary} strokeOpacity=".3" />
        <circle cx="58" cy="20" r="4" fill={primary} />
        <rect x="10" y="16" width="32" height="7" rx="3.5" fill={accent} />
      </g>
      {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={60 + i * 70 + j(30)} cy={40 + j(40)} r={3 + (i % 3)} fill={i % 2 ? primary : accent} opacity=".7" />)}
    </g>
  );
}

/** A fresh generator per render, so React's double render in dev gives identical output. */
function jitter(seed: string) {
  const r = rng(seed);
  return (n: number) => Math.round((r() - 0.5) * n * 10) / 10;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
