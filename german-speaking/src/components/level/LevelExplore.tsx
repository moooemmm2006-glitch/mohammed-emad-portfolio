"use client";

import { IconSprachcafe } from "@/components/Icons";
import Link from "next/link";
import { fill, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";
import { CHANNEL_NAME } from "@/lib/siteShared";
import { ChannelAvatar, SubscribeButton } from "../site/CreatorCard";
import { useSite } from "../site/SiteProvider";

// The end of a level page: one connected band (in the level's colour) with more activities,
// trusted official sources and who is behind the site — instead of the page just stopping.

const ACTIVITIES = [
  { href: (l: Level) => `/grammar/${l}`, emoji: "📘", title: "nav_grammar", sub: "explore_grammar_sub" },
  { href: () => "/community", emoji: "👥", title: "community_nav", sub: "explore_community_sub" },
  { href: () => "/sprachcafe", emoji: <IconSprachcafe size={22} />, title: "cafe_nav", sub: "explore_cafe_sub" },
  { href: (l: Level) => `/opinions?level=${l}`, emoji: "💬", title: "lrev_nav", sub: "lrev_explore_sub" },
  { href: () => "/review", emoji: "🔁", title: "book_review_title", sub: "explore_review_sub" },
  { href: () => "/progress", emoji: "📈", title: "nav_progress", sub: "explore_progress_sub" },
  { href: () => "/pause", emoji: "🎬", title: "pause_name", sub: "explore_pause_sub" },
] as const;

// Official sites only (checked): free courses, official model exams with answers and audio.
const SOURCES = [
  { href: "https://learngerman.dw.com/", name: "DW · Deutsch lernen", by: "Deutsche Welle", mark: "DW", color: "#0a3a6b", sub: "src_dw_sub" },
  { href: "https://www.goethe.de/ins/de/de/prf/exc.html", name: "Goethe-Institut", by: "Goethe-Zertifikat A1–C2", mark: "GI", color: "#2f7d32", sub: "src_goethe_sub" },
  { href: "https://osd.at/downloads/", name: "ÖSD", by: "Österreichisches Sprachdiplom", mark: "ÖSD", color: "#b3122e", sub: "src_osd_sub" },
  { href: "https://www.oesterreichinstitut.com/", name: "Österreich Institut", by: "Deutschkurse · ÖSD", mark: "ÖI", color: "#c8102e", sub: "src_oei_sub" },
] as const;

export function LevelExplore({ level }: { level: Level }) {
  const { t } = useUI();
  const { links } = useSite();
  const accent = LEVEL_CONFIG[level].accent;

  return (
    <div className="level-explore relative mt-12 rounded-[2rem] p-4 sm:p-7 space-y-10" style={{ ["--explore-c" as string]: accent }}>
      {/* 🎯 more activities */}
      <section aria-labelledby="explore-title">
        <p className="text-xs font-bold tracking-widest uppercase de" style={{ color: accent }} lang="de">
          Weiterlernen
        </p>
        <h2 id="explore-title" className="text-2xl sm:text-3xl font-extrabold mt-1">
          {fill(t("explore_title"), { level })}
        </h2>
        <p className="text-muted mt-1">{t("explore_sub")}</p>
        <ul className="mt-5 grid gap-3 grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-3">
          {ACTIVITIES.map((a) => (
            <li key={a.title}>
              <Link href={a.href(level)} className="explore-card group h-full card depth rounded-2xl p-4 flex items-start gap-3 hover:-translate-y-0.5 transition">
                <span className="grid place-items-center w-11 h-11 rounded-xl text-xl shrink-0" style={{ background: `color-mix(in oklab, ${accent} 14%, transparent)` }} aria-hidden="true">
                  {a.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold leading-snug">{t(a.title as TKey)}</span>
                  <span className="block text-sm text-muted leading-snug mt-0.5">{t(a.sub as TKey)}</span>
                </span>
                <span className="ms-auto self-center text-muted group-hover:text-ink transition rtl:rotate-180" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 📚 trusted sources */}
      <section aria-labelledby="sources-title">
        <h2 id="sources-title" className="text-xl sm:text-2xl font-extrabold">
          {t("sources_title")}
        </h2>
        <p className="text-muted mt-1 text-sm">{t("sources_sub")}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group h-full card rounded-2xl p-4 flex items-start gap-3 hover:shadow-lg transition"
                aria-label={`${s.name} – ${t("external_link")}`}
              >
                <span className="grid place-items-center w-12 h-12 rounded-xl text-white text-sm font-extrabold shrink-0 de" style={{ background: s.color }} aria-hidden="true">
                  {s.mark}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-bold de" lang="de">
                      {s.name}
                    </span>
                    <span className="text-xs text-muted de" lang="de">
                      {s.by}
                    </span>
                  </span>
                  <span className="block text-sm text-muted leading-snug mt-1">{fill(t(s.sub as TKey), { level })}</span>
                </span>
                <span className="text-muted group-hover:text-ink text-sm shrink-0" aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* 👋 about */}
      <section aria-labelledby="about-title" className="card depth rounded-3xl p-5 sm:p-7 grid gap-5 sm:grid-cols-[auto_1fr] items-start">
        <ChannelAvatar photo={links.channelPhoto} size={84} />
        <div className="min-w-0">
          <h2 id="about-title" className="text-xl sm:text-2xl font-extrabold">
            {t("about_title")}
          </h2>
          <p className="font-bold mt-1" dir="auto">
            {CHANNEL_NAME}
          </p>
          <p className="mt-3 leading-relaxed text-[15px]">{t("about_text")}</p>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {(["about_chip_levels", "about_chip_skills", "about_chip_ar", "about_chip_together"] as const).map((k) => (
              <li key={k} className="rounded-full border border-line bg-surface-2/60 px-3 py-1">
                {t(k)}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <SubscribeButton place="level_end" />
            <Link href="/pause" className="btn btn-ghost">
              ☕ {t("pause_name")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
