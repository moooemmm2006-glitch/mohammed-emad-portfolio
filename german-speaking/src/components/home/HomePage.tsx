"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IntroVideoPoster } from "@/components/site/IntroVideo";
import { IconSprachcafe } from "@/components/Icons";
import { ProductivitySection } from "@/components/productivity/ProductivitySection";
import { api } from "@/lib/client/api";
import { fill, type TKey } from "@/lib/client/i18n";
import { useMe } from "@/lib/client/me";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, LEVELS, type Level } from "@/lib/levels";
import { levelPath } from "@/lib/paths";
import type { SkillProgress } from "@/lib/skills";
import type { Vlog } from "@/lib/siteShared";
import { posterFor } from "../../../data/videos";

// 🏠 Home: a calm, professional start page. Welcome + "continue", the intro video with its
// description, the four levels with the learner's progress, and everything the site offers.

const overall = (p: SkillProgress) => Math.round((p.speak + p.listen + p.read + p.write) / 4);

export function HomePage({ lastLevel }: { lastLevel: Level | null }) {
  const { t } = useUI();
  const { me } = useMe();
  const [progress, setProgress] = useState<Partial<Record<Level, number>>>({});
  useEffect(() => {
    for (const l of LEVELS) api<SkillProgress>(`/api/level/${l}/progress`).then((p) => setProgress((x) => ({ ...x, [l]: overall(p) })), () => {});
  }, []);
  // The newest vlog, as a calm "take a break" card.
  const [vlog, setVlog] = useState<Vlog | null>(null);
  useEffect(() => {
    api<{ vlogs: Vlog[] }>("/api/vlogs").then((r) => setVlog(r.vlogs[0] ?? null), () => {});
  }, []);
  const current: Level = lastLevel ?? "A1";
  const first = me?.user.name?.trim().split(/\s+/)[0];

  return (
    <div className="max-w-6xl mx-auto space-y-10 sm:space-y-14 pb-6" data-testid="home-page">
      {/* ── Welcome ── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-line bg-surface p-6 sm:p-10 shadow-[var(--shadow)]" aria-labelledby="home-title">
        <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full blur-3xl opacity-25" style={{ background: LEVEL_CONFIG[current].accent }} aria-hidden="true" />
        <div className="absolute bottom-0 inset-x-0 h-1.5 flex" dir="ltr" aria-hidden="true">
          <span className="flex-1 bg-[#111]" />
          <span className="flex-1 bg-[#dd0000]" />
          <span className="flex-1 bg-[#ffce00]" />
        </div>
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-muted de" lang="de">
            Sprich Deutsch
          </p>
          <h1 id="home-title" className="mt-2 text-3xl sm:text-5xl font-extrabold leading-tight">
            <span className="de" lang="de">{first ? fill(t("home_hello"), { name: first }) : t("home_hello_anon")}</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted leading-relaxed">{t("home_sub")}</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href={levelPath(current)} className="btn btn-primary !min-h-[48px] !px-6" data-testid="home-continue">
              {lastLevel ? fill(t("home_continue"), { level: current }) : t("home_start")}
            </Link>
            <Link href={`${levelPath(current)}/plan`} className="btn btn-ghost !min-h-[48px]">
              🗺️ {t("home_plan")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Intro video + its description ── */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-center" aria-labelledby="intro-title" data-testid="intro-video">
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-muted de" lang="de">
            Willkommen
          </p>
          <h2 id="intro-title" className="text-2xl sm:text-3xl font-extrabold">
            {t("intro_title")}
          </h2>
          <p className="text-muted leading-relaxed">{t("intro_sub")}</p>
          <ul className="space-y-2.5">
            {(["intro_point_1", "intro_point_2", "intro_point_3"] as const).map((k) => (
              <li key={k} className="flex items-start gap-2.5">
                <span className="mt-1 grid place-items-center w-5 h-5 shrink-0 rounded-full bg-emerald-600 text-white text-[11px] font-bold" aria-hidden="true">
                  ✓
                </span>
                <span className="leading-relaxed">{t(k)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t("intro_consent")}</p>
        </div>
        <IntroVideoPoster />
      </section>

      {/* ── The four levels ── */}
      <section aria-labelledby="levels-title" className="space-y-4">
        <div>
          <h2 id="levels-title" className="text-2xl sm:text-3xl font-extrabold">
            {t("home_levels_title")}
          </h2>
          <p className="text-muted mt-1">{t("home_levels_sub")}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((l) => {
            const accent = LEVEL_CONFIG[l].accent;
            const pct = progress[l];
            return (
              <li key={l}>
                <Link href={levelPath(l)} className="group card h-full p-5 flex flex-col gap-3 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderTop: `4px solid ${accent}` }} data-testid={`home-level-${l}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xl font-black de" style={{ color: accent }} lang="de">
                      {l}
                    </span>
                    {l === lastLevel && <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: accent }}>{t("home_current")}</span>}
                  </div>
                  <p className="font-bold">{t(`lvl_${l}_name` as TKey)}</p>
                  <p className="text-sm text-muted leading-relaxed line-clamp-3 flex-1">{t(`lvl_${l}_desc` as TKey)}</p>
                  <div>
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>{t("home_progress")}</span>
                      <span className="tabular-nums">{pct == null ? "–" : `${pct}%`}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct ?? 0}%`, background: accent }} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Everything on the site ── */}
      <section aria-labelledby="features-title" className="space-y-4">
        <div>
          <h2 id="features-title" className="text-2xl sm:text-3xl font-extrabold">
            {t("home_features_title")}
          </h2>
          <p className="text-muted mt-1">{t("home_features_sub")}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: levelPath(current), icon: "🗣️", title: "home_f_speak", sub: "home_f_speak_sub" },
            { href: `${levelPath(current)}?skill=listen`, icon: "🎧", title: "home_f_listen", sub: "home_f_listen_sub" },
            { href: `${levelPath(current)}/plan`, icon: "🗺️", title: "home_f_plan", sub: "home_f_plan_sub" },
            { href: "/grammar", icon: "📘", title: "home_f_grammar", sub: "home_f_grammar_sub" },
            { href: "/community", icon: "👥", title: "home_f_community", sub: "home_f_community_sub" },
            { href: "/sprachcafe", icon: <IconSprachcafe size={22} />, title: "home_f_cafe", sub: "home_f_cafe_sub" },
          ].map((f) => (
            <li key={f.title}>
              <Link href={f.href} className="group card h-full p-4 sm:p-5 flex items-start gap-3.5 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2">
                <span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-surface-2 text-xl" aria-hidden="true">
                  {f.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{t(f.title as TKey)}</span>
                  <span className="block text-sm text-muted leading-snug mt-0.5">{t(f.sub as TKey)}</span>
                </span>
                <span className="self-center text-muted transition group-hover:text-ink rtl:rotate-180" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Productivity & time management ── */}
      <ProductivitySection compact />

      {/* ── From the vlogs: a calm break ── */}
      {vlog && (
        <section aria-labelledby="vlog-title" className="space-y-4" data-testid="home-vlog">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-muted de" lang="de">
                Pause
              </p>
              <h2 id="vlog-title" className="text-2xl sm:text-3xl font-extrabold">
                {t("home_vlog_title")}
              </h2>
              <p className="text-muted mt-1">{t("home_vlog_sub")}</p>
            </div>
            <Link href="/pause" className="text-sm font-bold underline-offset-4 hover:underline">
              {t("home_vlog_all")} ←
            </Link>
          </div>
          <Link href="/pause" className="group card overflow-hidden grid md:grid-cols-[1.4fr_1fr] items-center transition hover:-translate-y-0.5">
            <span className="relative block aspect-video overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element -- the vlog's own thumbnail */}
              <img src={posterFor(vlog.youtubeId)} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]" />
              <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
                <span className="grid place-items-center w-16 h-16 rounded-full bg-[#ff0033] text-white text-2xl shadow-xl">▶</span>
              </span>
            </span>
            <span className="p-5 sm:p-7 flex flex-col justify-center gap-2">
              <span className="text-xl sm:text-2xl font-extrabold de text-end" lang="de">
                {vlog.title.replace(/🇩🇪/g, "").trim()}
              </span>
              {vlog.description_ar && <span className="text-muted leading-relaxed">{vlog.description_ar}</span>}
              <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-bold">☕ {t("home_vlog_cta")}</span>
            </span>
          </Link>
        </section>
      )}

      {/* ── Closing call to action ── */}
      <section className="rounded-[2rem] p-6 sm:p-10 text-center text-white" style={{ background: "linear-gradient(135deg, #1f3a5f, #0f766e)" }}>
        <h2 className="text-2xl sm:text-3xl font-extrabold">{t("home_cta_title")}</h2>
        <p className="mt-2 opacity-85">{t("home_cta_sub")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Link href={levelPath(current)} className="btn !min-h-[48px] !px-6 bg-white !text-[#1f3a5f] hover:brightness-95">
            {lastLevel ? fill(t("home_continue"), { level: current }) : t("home_start")}
          </Link>
          <a href="/reviews" className="btn !min-h-[48px] border border-white/40 !text-white hover:bg-white/10" lang="en">
            Reviews
          </a>
        </div>
      </section>
    </div>
  );
}
