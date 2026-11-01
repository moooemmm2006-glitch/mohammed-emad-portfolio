"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { YouTubePlayer } from "@/components/videos/YouTubePlayer";
import { api } from "@/lib/client/api";
import { useMe } from "@/lib/client/me";
import { useUI } from "@/lib/client/ui";
import { CREATORS, CREATOR_INFO, subscribeUrl, type Creator, type ProductivityItem } from "@/lib/productivityShared";

// 🎯 "ذاكر أذكى: الإنتاجية وتنظيم الوقت" — videos (official YouTube embed, so views count for the
// creator), courses (links to the creator's own page) and a subscribe button, one tab per creator.
// `compact` (home): two videos + one course and a link to the full page.

export function ProductivitySection({ compact = false, headingLevel = 2 }: { compact?: boolean; headingLevel?: 1 | 2 }) {
  const { t, lang } = useUI();
  const { me } = useMe();
  const [items, setItems] = useState<ProductivityItem[] | null>(null);
  const [tab, setTab] = useState<Creator>("abouzeid");
  useEffect(() => {
    api<{ items: ProductivityItem[] }>("/api/productivity").then((d) => setItems(d.items), () => setItems([]));
  }, []);

  const mine = useMemo(() => (items ?? []).filter((i) => i.creator === tab), [items, tab]);
  const videos = mine.filter((i) => i.kind === "video" && i.youtubeId);
  const courses = mine.filter((i) => i.kind === "course");
  const channel = mine.find((i) => i.kind === "channel");
  const shownVideos = compact ? videos.slice(0, 2) : videos;
  const shownCourses = compact ? courses.slice(0, 1) : courses;
  const info = CREATOR_INFO[tab];
  const name = lang === "ar" ? info.ar : info.latin;
  const H = headingLevel === 1 ? "h1" : "h2";
  const isAdmin = me?.user.role === "admin";

  return (
    <section aria-labelledby="prod-title" className="space-y-4" data-testid="productivity">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#0f766e] de" lang="de">
            Produktivität
          </p>
          <H id="prod-title" className={headingLevel === 1 ? "text-3xl sm:text-4xl font-extrabold" : "text-2xl sm:text-3xl font-extrabold"}>
            {t("prod_title")}
          </H>
          <p className="text-muted mt-1">{t("prod_sub")}</p>
        </div>
        {compact && (
          <Link href="/productivity" className="text-sm font-bold underline-offset-4 hover:underline" data-testid="prod-open-all">
            {t("prod_open_all")} ←
          </Link>
        )}
      </div>

      <div className="card p-4 sm:p-6 space-y-5">
        <div role="tablist" aria-label={t("prod_title")} className="flex flex-wrap gap-2">
          {CREATORS.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={tab === c}
              onClick={() => setTab(c)}
              className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${tab === c ? "bg-[#1f3a5f] border-[#1f3a5f] text-white" : "border-line hover:bg-surface-2"}`}
            >
              {lang === "ar" ? CREATOR_INFO[c].ar : CREATOR_INFO[c].latin}
            </button>
          ))}
        </div>

        <div role="tabpanel" aria-label={name} className="space-y-5">
          {!items && <div className="h-48 rounded-2xl bg-surface-2/60 animate-pulse" aria-hidden="true" />}
          {items && shownVideos.length === 0 && shownCourses.length === 0 && (
            <p className="rounded-2xl bg-surface-2 p-5 text-muted">
              {t("prod_empty")}{" "}
              {isAdmin && (
                <Link href="/admin#productivity" className="font-bold underline">
                  {t("prod_empty_admin")}
                </Link>
              )}
            </p>
          )}
          {shownVideos.length > 0 && (
            <ul className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
              {shownVideos.map((v) => (
                <li key={v.id} className="space-y-2">
                  <YouTubePlayer videoId={v.youtubeId!} title={v.title} />
                  <p className="font-bold leading-snug" dir="auto">
                    {v.title}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {shownCourses.length > 0 && (
            <div className="space-y-2">
              {!compact && <h3 className="font-extrabold">{t("prod_courses")}</h3>}
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shownCourses.map((c) => (
                  <li key={c.id}>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col gap-2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-surface p-4 transition hover:-translate-y-0.5 dark:border-amber-900/50 dark:from-amber-950/30">
                      <span className="w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{t("prod_course")}</span>
                      <span className="font-bold leading-snug" dir="auto">
                        {c.title}
                      </span>
                      <span className="mt-auto text-sm font-bold text-[#1f3a5f] dark:text-sky-300">{t("prod_course_cta")} ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 font-extrabold de" aria-hidden="true">
                {info.initials}
              </span>
              <span>
                <span className="block font-bold">{name}</span>
                <span className="block text-sm text-muted">{t("prod_channel")}</span>
              </span>
            </div>
            {channel && (
              <a href={subscribeUrl(channel.url)} target="_blank" rel="noopener noreferrer" className="btn btn-yt" data-testid="prod-subscribe">
                ▶ {t("prod_subscribe")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
