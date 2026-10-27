"use client";

import Link from "next/link";
import { LevelCard } from "@/components/LevelCard";
import { IconChart, IconClock, IconFile, IconFlame, IconMic, IconSparkle } from "@/components/Icons";
import { useProviders, useStats } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { LEVELS } from "@/lib/levels";

export default function HomePage() {
  const { t } = useUI();
  const { stats } = useStats();
  const providers = useProviders();

  return (
    <div className="space-y-12">
      {providers?.storage === "temporary" && (
        <p role="alert" className="rounded-xl bg-danger/10 text-danger px-4 py-3 text-sm">
          {t("storage_temp")}
        </p>
      )}
      <section className="relative overflow-hidden rounded-[2rem] bg-surface border border-line px-6 py-10 sm:px-10 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -end-24 w-80 h-80 rounded-full opacity-25 blur-3xl" style={{ background: "conic-gradient(var(--a1), var(--a2), var(--b1), var(--b2), var(--a1))" }} />
        <p className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold text-gold">
          <IconSparkle size={16} /> {t("hero_kicker")} · <span className="de">Sprechen zuerst</span>
        </p>
        <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold leading-tight max-w-3xl">{t("hero_title")}</h1>
        <p className="mt-4 text-muted max-w-2xl text-lg">{t("hero_body")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/speak" className="btn btn-primary text-lg !px-7 !py-3">
            <IconMic /> {t("hero_cta")}
          </Link>
          <Link href="/progress" className="btn btn-ghost">
            <IconChart /> {t("hero_secondary")}
          </Link>
        </div>
        <p className="mt-6 de text-sm text-muted">„Ich spreche Deutsch — nicht perfekt, aber jeden Tag besser.“</p>
      </section>

      <section aria-label="Stats" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={<IconFile />} value={stats?.totals.sessions} label={t("stats_sessions")} />
        <Stat icon={<IconClock />} value={stats?.totals.minutes} label={t("stats_minutes")} />
        <Stat icon={<IconMic />} value={stats?.totals.words} label={t("stats_words")} />
        <Stat icon={<IconFlame />} value={stats?.totals.streak} label={t("stats_streak")} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">{t("levels_title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((l) => (
            <LevelCard key={l} level={l} compact lastSessionAt={stats?.levels[l].lastSessionAt} lastScore={stats?.levels[l].lastScore} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">{t("how_title")}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className="card p-5">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-brand text-brand-ink font-bold">{n}</span>
              <h3 className="mt-3 font-bold text-lg">{t(`how_${n}_t`)}</h3>
              <p className="text-muted">{t(`how_${n}_b`)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | undefined; label: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className="grid place-items-center w-10 h-10 rounded-xl bg-surface-2 text-gold">{icon}</span>
      <div>
        <div className="text-2xl font-extrabold tabular-nums">{value ?? "–"}</div>
        <div className="text-sm text-muted">{label}</div>
      </div>
    </div>
  );
}
