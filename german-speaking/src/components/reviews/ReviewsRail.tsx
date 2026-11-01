"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Stars } from "@/components/sprachcafe/CafeReviews";
import { api } from "@/lib/client/api";
import { fill } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";

// ⭐ A small, quiet reviews widget beside the content on wide screens (like the rating badges on big
// sites): the average, one opinion at a time (changing every few seconds), and two small links.
// It must never pull the eye away from the lessons.

type Review = { id: string; rating: number; comment: string; name: string };
type Data = { average: number | null; count: number; reviews: Review[] };

export function ReviewsRail({ inline = false }: { inline?: boolean }) {
  const { t } = useUI();
  const [data, setData] = useState<Data | null>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    api<Data>("/api/level-reviews?level=SITE").then(setData, () => setData({ average: null, count: 0, reviews: [] }));
  }, []);
  const reviews = data?.reviews ?? [];
  useEffect(() => {
    if (reviews.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % reviews.length), 7000);
    return () => window.clearInterval(id);
  }, [reviews.length]);
  if (!data) return null;
  const r = reviews[i % Math.max(1, reviews.length)];

  return (
    <aside className={`${inline ? "" : "sticky top-24"} card p-4 space-y-3 text-sm`} aria-labelledby={inline ? "rail-title-inline" : "rail-title"} data-testid={inline ? "reviews-inline" : "reviews-rail"}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={inline ? "rail-title-inline" : "rail-title"} className="text-xs font-bold tracking-wide text-muted">
          {t("rv_page_title")}
        </h2>
        {data.count > 0 && data.average != null && (
          <span className="flex items-center gap-1">
            <span className="font-extrabold tabular-nums">{data.average.toFixed(1)}</span>
            <Stars value={data.average} size="text-xs" />
          </span>
        )}
      </div>

      {r ? (
        <figure key={r.id} className="rail-fade space-y-1.5">
          <blockquote className="text-[13px] leading-relaxed line-clamp-3 break-words" dir="auto">
            “{r.comment}”
          </blockquote>
          <figcaption className="text-xs text-muted">— {r.name}</figcaption>
        </figure>
      ) : (
        <p className="text-xs text-muted leading-relaxed">{t("rv_none_yet")}</p>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line text-xs">
        <Link href="/opinions" className="font-semibold hover:underline">
          {t("lrev_write")}
        </Link>
        <a href="/reviews" className="text-muted hover:underline">
          {data.count > 0 ? fill(t("rv_all_n"), { n: data.count }) : t("rv_see_all")}
        </a>
      </div>
    </aside>
  );
}
