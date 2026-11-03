"use client";

import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  MapBranch,
  MapCard,
  MapColor,
  MindMap as MindMapData,
} from "@/lib/grammarMap";
import { useUI } from "@/lib/client/ui";

// 🗺️ A grammar lesson as a mind map: a purple centre card, colored branches around it with
// curved connectors (desktop), stacked with a colored rail on phones. German stays LTR; the
// small Arabic glosses sit right-aligned like notes.

const C: Record<
  MapColor,
  { panel: string; chip: string; title: string; line: string; mark: string }
> = {
  green: {
    panel:
      "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-900/60",
    chip: "bg-emerald-600",
    title: "bg-emerald-700",
    line: "#059669",
    mark: "bg-emerald-600 text-white",
  },
  amber: {
    panel:
      "bg-amber-50/80 border-amber-200 dark:bg-amber-950/25 dark:border-amber-900/60",
    chip: "bg-amber-600",
    title: "bg-amber-700",
    line: "#d97706",
    mark: "bg-amber-600 text-white",
  },
  blue: {
    panel:
      "bg-sky-50/80 border-sky-200 dark:bg-sky-950/25 dark:border-sky-900/60",
    chip: "bg-sky-600",
    title: "bg-sky-700",
    line: "#0284c7",
    mark: "bg-sky-600 text-white",
  },
  rose: {
    panel:
      "bg-rose-50/80 border-rose-200 dark:bg-rose-950/25 dark:border-rose-900/60",
    chip: "bg-rose-600",
    title: "bg-rose-700",
    line: "#e11d48",
    mark: "bg-rose-600 text-white",
  },
  violet: {
    panel:
      "bg-violet-50/80 border-violet-200 dark:bg-violet-950/25 dark:border-violet-900/60",
    chip: "bg-violet-600",
    title: "bg-violet-700",
    line: "#7c3aed",
    mark: "bg-violet-600 text-white",
  },
  teal: {
    panel:
      "bg-teal-50/80 border-teal-200 dark:bg-teal-950/25 dark:border-teal-900/60",
    chip: "bg-teal-600",
    title: "bg-teal-700",
    line: "#0d9488",
    mark: "bg-teal-600 text-white",
  },
};

/** "[auf]stehen" → auf as a colored chip + stehen. */
function Marked({ text, mark }: { text: string; mark: string }) {
  const parts = text.split(/(\[[^\]]+\])/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[") ? (
          <span key={i} className={`mx-px rounded-md px-1 py-px ${mark}`}>
            {p.slice(1, -1)}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

type Say = ((de: string) => void) | undefined;

function Card({
  card,
  color,
  onSay,
}: {
  card: MapCard;
  color: MapColor;
  onSay: Say;
}) {
  const c = C[color];
  const long = card.ar.length > 90;
  return (
    <div
      className={`relative rounded-xl border border-black/5 bg-surface p-3 shadow-[0_6px_16px_-10px_rgba(15,31,53,.35)] dark:border-white/10 ${card.wide ? "@sm:col-span-2" : ""} ${card.say && onSay ? "ps-12" : ""}`}
    >
      {card.say && onSay && (
        <button
          type="button"
          onClick={() => onSay(card.say!)}
          aria-label={`▶ ${card.say}`}
          className={`absolute start-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full text-white shadow ${c.chip}`}
        >
          ▶
        </button>
      )}
      {card.tag && (
        <span className="absolute -top-2 end-2 rounded-full border border-line bg-surface px-2 py-px text-[10px] font-bold uppercase tracking-wide text-muted">
          {card.tag}
        </span>
      )}
      <p className="text-[17px] font-extrabold leading-snug" lang="de">
        <Marked text={card.head} mark={c.mark} />
      </p>
      {card.ar && (
        <p
          className={`mt-0.5 text-end text-muted ${long ? "text-sm leading-relaxed" : "text-xs"}`}
          dir="rtl"
          lang="ar"
        >
          {card.ar}
        </p>
      )}
      {card.ex && (
        <p className="mt-1.5 text-sm leading-snug" lang="de">
          <Marked text={card.ex} mark={c.mark} />
        </p>
      )}
      {card.note && (
        <p
          className="mt-1.5 text-[17px] leading-tight text-ink/80"
          style={{ fontFamily: "Caveat, cursive" }}
          lang="de"
        >
          ⇒ {card.note}
        </p>
      )}
    </div>
  );
}

function Branch({
  b,
  setRef,
  onSay,
}: {
  b: MapBranch;
  setRef: (el: HTMLElement | null) => void;
  onSay: Say;
}) {
  const c = C[b.color];
  return (
    <section
      ref={setRef}
      className={`@container relative rounded-2xl border p-3 pt-0 ${c.panel}`}
      aria-label={b.title}
    >
      <span
        className={`relative -mt-3.5 mb-1 inline-block max-w-full rounded-lg px-2.5 py-1 text-sm font-extrabold leading-snug text-white shadow ${c.title}`}
        lang="de"
      >
        {b.title}
      </span>
      {b.titleAr ? (
        <p
          className="mb-2 text-end text-xs font-bold text-muted"
          dir="rtl"
          lang="ar"
        >
          {b.titleAr}
        </p>
      ) : (
        <div className="h-1" />
      )}
      <div
        className={`grid gap-2.5 ${b.cards.length > 1 ? "@sm:grid-cols-2" : ""}`}
      >
        {b.cards.map((card, i) => (
          <Card key={i} card={card} color={b.color} onSay={onSay} />
        ))}
      </div>
    </section>
  );
}

export function MindMap({
  map,
  titleDe,
  titleAr,
  eyebrow,
  onSay,
}: {
  map: MindMapData;
  titleDe: string;
  titleAr: string;
  eyebrow: string;
  /** Reads a German example aloud (cards with `say`). */
  onSay?: (de: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const centre = useRef<HTMLDivElement>(null);
  const heads = useRef<(HTMLElement | null)[]>([]);
  const [paths, setPaths] = useState<{ d: string; color: string }[]>([]);
  // Branches alternate left / right of the centre on wide screens.
  const left = map.branches
    .map((b, i) => ({ b, i }))
    .filter((x) => x.i % 2 === 0);
  const right = map.branches
    .map((b, i) => ({ b, i }))
    .filter((x) => x.i % 2 === 1);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => {
      const cr = centre.current?.getBoundingClientRect();
      const br = el.getBoundingClientRect();
      // Connectors only in the three-column layout (the map itself is ≥ 64rem wide).
      if (!cr || el.clientWidth < 1024) return setPaths([]);
      setPaths(
        map.branches.flatMap((b, i) => {
          const h = heads.current[i]?.getBoundingClientRect();
          if (!h) return [];
          const toLeft = h.left + h.width / 2 < cr.left;
          const sx = (toLeft ? cr.left : cr.right) - br.left;
          // From the centre's side to the branch panel's near edge, a little below its top.
          const ty = h.top + 28;
          const sy =
            Math.min(Math.max(ty, cr.top + 24), cr.bottom - 24) - br.top;
          const ex = (toLeft ? h.right : h.left) - br.left;
          const ey = ty - br.top;
          const mx = (sx + ex) / 2;
          return [
            {
              d: `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`,
              color: C[b.color].line,
            },
          ];
        }),
      );
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    window.addEventListener("resize", draw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [map]);

  const column = (items: { b: MapBranch; i: number }[]): ReactNode => (
    <div className="flex flex-col gap-6">
      {items.map(({ b, i }) => (
        <Branch
          key={i}
          b={b}
          onSay={onSay}
          setRef={(e) => (heads.current[i] = e)}
        />
      ))}
    </div>
  );

  return (
    <div
      ref={box}
      dir="ltr"
      className="@container relative rounded-[2rem] border border-line p-4 sm:p-6"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in oklab, var(--color-muted, #94a3b8) 28%, transparent) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
      data-testid="grammar-map"
    >
      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full @5xl:block"
        aria-hidden="true"
      >
        {paths.map((p, i) => (
          <g key={i}>
            <path
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle
              cx={p.d.split(" ").pop()!.split(",")[0]}
              cy={p.d.split(" ").pop()!.split(",")[1]}
              r="4.5"
              fill={p.color}
            />
          </g>
        ))}
      </svg>
      <div className="relative grid gap-6 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)] @5xl:items-center">
        <div className="hidden @5xl:block">{column(left)}</div>
        <div className="space-y-4">
          <div
            ref={centre}
            className="rounded-[1.6rem] p-5 text-white shadow-[0_24px_50px_-20px_rgba(91,33,182,.7)]"
            style={{ background: "linear-gradient(150deg, #7c3aed, #5b21b6)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-80">
              {eyebrow}
            </p>
            <h2
              className="mt-1 text-2xl xl:text-3xl font-black leading-tight break-words"
              style={{ hyphens: "auto" }}
              lang="de"
            >
              {titleDe}
            </h2>
            <p className="mt-1 text-end text-sm opacity-90" dir="rtl" lang="ar">
              {titleAr}
            </p>
            {map.formula.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {map.formula.map((f, i) =>
                  ["+", "→", "=", "·", "↔"].includes(f) ? (
                    <span key={i} className="font-black opacity-80">
                      {f}
                    </span>
                  ) : (
                    <span
                      key={i}
                      className="rounded-lg bg-white/20 px-2.5 py-1 text-sm font-bold"
                    >
                      {f}
                    </span>
                  ),
                )}
              </div>
            )}
            {map.ex && (
              <p className="mt-4 text-[17px] font-bold" lang="de">
                <Marked text={map.ex} mark="bg-white text-violet-700" />
              </p>
            )}
            {map.exAr && (
              <p
                className="mt-1 text-end text-sm opacity-85"
                dir="rtl"
                lang="ar"
              >
                {map.exAr}
              </p>
            )}
          </div>
          {map.phrases && map.phrases.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <p className="text-sm font-extrabold" lang="de">
                Sätze zum Merken
              </p>
              <ul
                className="mt-1.5 space-y-1 text-[18px] leading-tight"
                style={{ fontFamily: "Caveat, cursive" }}
                lang="de"
              >
                {map.phrases.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="hidden @5xl:block">{column(right)}</div>
        {/* Narrower maps: every branch under the centre — two columns when there is room, one on phones. */}
        <div className="flex flex-col gap-6 @2xl:grid @2xl:grid-cols-2 @2xl:items-start @5xl:hidden">
          {map.branches.map((b, i) => (
            <Branch key={i} b={b} onSay={onSay} setRef={() => {}} />
          ))}
        </div>
      </div>
      <GrammarSource className="relative mt-5" />
    </div>
  );
}

/** "Inspired by Grammatik aktiv" — shown on every grammar map and grammar page. */
export function GrammarSource({ className = "" }: { className?: string }) {
  const { t } = useUI();
  return <SourceNote text={t("grammar_source")} className={className} testid="grammar-source" />;
}

/** A small "📖 based on …" pill. */
export function SourceNote({ text, className = "", testid }: { text: string; className?: string; testid?: string }) {
  return (
    <p
      dir="auto"
      className={`me-auto flex w-fit items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-sm text-muted shadow-sm ${className}`}
      data-testid={testid}
    >
      <span
        aria-hidden="true"
        className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-base"
      >
        📖
      </span>
      <span className="font-semibold">{text}</span>
    </p>
  );
}
