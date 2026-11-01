"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Stars } from "@/components/sprachcafe/CafeReviews";
import { api } from "@/lib/client/api";
import { fill } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";

// ⭐ «الريفيوز» as a side panel on wide screens (under the profile circle): the site's approved
// opinions slowly scrolling up, the average on top, and the way to add your own.

type Review = { id: string; rating: number; comment: string; name: string; level: string; at: number };
type Data = { average: number | null; count: number; reviews: Review[] };
const ACCENT = "#7c3aed";

function RailCard({ r }: { r: Review }) {
  return (
    <li className="rounded-2xl border border-line bg-surface p-3.5 space-y-2 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="grid place-items-center w-7 h-7 rounded-full text-xs font-black text-white shrink-0" style={{ background: ACCENT }} aria-hidden="true">
            {r.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="font-bold text-sm truncate">{r.name}</span>
        </span>
        <Stars value={r.rating} size="text-xs" />
      </div>
      <p className="text-[13px] leading-relaxed text-muted line-clamp-4 break-words" dir="auto">
        {r.comment}
      </p>
    </li>
  );
}

export function ReviewsRail() {
  const { t } = useUI();
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    api<Data>("/api/level-reviews?level=SITE").then(setData, () => setData({ average: null, count: 0, reviews: [] }));
  }, []);
  const reviews = data?.reviews ?? [];
  const moving = reviews.length >= 3;

  return (
    <aside className="sticky top-24 rounded-3xl border-2 p-4 space-y-4 shadow-lg" style={{ borderColor: `color-mix(in oklab, ${ACCENT} 30%, transparent)`, background: `linear-gradient(180deg, color-mix(in oklab, ${ACCENT} 8%, var(--surface)), var(--surface) 45%)` }} aria-labelledby="rail-title" data-testid="reviews-rail">
      <div className="text-center space-y-1.5">
        <p className="text-[11px] font-bold tracking-widest uppercase de" style={{ color: ACCENT }} lang="de">
          Bewertungen
        </p>
        <h2 id="rail-title" className="text-xl font-extrabold">
          {t("rv_page_title")}
        </h2>
        {data && data.count > 0 && data.average != null ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-4xl font-black tabular-nums leading-none">{data.average.toFixed(1)}</span>
            <Stars value={data.average} size="text-lg" />
            <span className="text-xs text-muted">{fill(t("lrev_count"), { n: data.count })}</span>
          </div>
        ) : (
          <p className="text-xs text-muted leading-relaxed">{data ? t("rv_none_yet") : t("loading")}</p>
        )}
      </div>

      {reviews.length > 0 && (
        <div className={`rail-window relative overflow-hidden ${moving ? "h-[min(46vh,420px)]" : ""}`}>
          <div className={moving ? "rail-track" : ""} style={moving ? { animationDuration: `${Math.max(18, reviews.length * 7)}s` } : undefined}>
            <ul className="space-y-2.5 pb-2.5">
              {reviews.map((r) => (
                <RailCard key={r.id} r={r} />
              ))}
            </ul>
            {moving && (
              <ul className="space-y-2.5 pb-2.5 rail-copy" aria-hidden="true">
                {reviews.map((r) => (
                  <RailCard key={`c-${r.id}`} r={r} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <Link href="/opinions" className="btn btn-primary !min-h-[42px] w-full text-sm">
          {t("lrev_write")}
        </Link>
        <a href="/reviews" className="text-center text-sm font-bold underline" style={{ color: ACCENT }}>
          {t("rv_see_all")}
        </a>
      </div>
    </aside>
  );
}
