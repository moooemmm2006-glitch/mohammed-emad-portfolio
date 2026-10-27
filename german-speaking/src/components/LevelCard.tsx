"use client";

import Link from "next/link";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";
import { useUI } from "@/lib/client/ui";
import { Avatar } from "./Avatar";
import { IconArrow } from "./Icons";

export function LevelCard({ level, lastSessionAt, lastScore, compact = false }: { level: Level; lastSessionAt?: number | null; lastScore?: number | null; compact?: boolean }) {
  const { t, lang } = useUI();
  const cfg = LEVEL_CONFIG[level];
  const name = level === "B2" ? "Dr. Tobias" : cfg.persona.name;
  return (
    <Link
      href={`/speak/${level}`}
      className={`level-${level.toLowerCase()} card group relative overflow-hidden p-5 flex flex-col gap-4 hover:-translate-y-0.5 transition-transform border-t-4 border-t-[var(--accent)]`}
    >
      <div className="flex items-center gap-4">
        <Avatar level={level} size={compact ? 64 : 84} scene={!compact} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-sm font-bold text-white bg-accent de">{level}</span>
            <span className="font-bold text-lg">{cfg.info.name[lang]}</span>
          </div>
          {cfg.info.note && <p className="text-xs text-muted">{cfg.info.note[lang]}</p>}
          <p className="text-sm text-muted mt-0.5">
            {t("level_partner")}: <span className="de font-semibold text-ink">{name}</span>
          </p>
        </div>
      </div>
      {!compact && <p className="text-[0.95rem] leading-relaxed">{cfg.info.topics[lang]}</p>}
      <div className="flex flex-wrap gap-1.5">
        {cfg.info.exampleTopics.map((x) => (
          <span key={x.en} className="rounded-full bg-accent-soft text-accent px-2.5 py-0.5 text-xs font-semibold">
            {x[lang]}
          </span>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-muted">
        <span>
          {lastSessionAt ? `${t("level_last")}: ${new Date(lastSessionAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}` : t("level_never")}
          {lastScore != null && (
            <>
              {" · "}
              {t("level_score")}: <b className="text-ink">{lastScore}</b>
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-accent whitespace-nowrap">
          {t("level_start")} <span className="de">{cfg.persona.name}</span>
          <IconArrow size={16} className="rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

/** The four levels as two groups: Grundlagen (A1, A2) and Aufbau (B1, B2). */
export function LevelGroups({ levels, compact = false }: { levels: Record<Level, { lastSessionAt: number | null; lastScore: number | null }> | undefined; compact?: boolean }) {
  const { t } = useUI();
  const groups = [
    { key: "grundlagen", title: t("group_basics"), sub: t("group_basics_sub"), members: ["A1", "A2"] as Level[] },
    { key: "aufbau", title: t("group_build"), sub: t("group_build_sub"), members: ["B1", "B2"] as Level[] },
  ];
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key} className="rounded-[1.75rem] border border-line bg-surface-2/60 p-4 sm:p-5" aria-label={g.title}>
          <header className="mb-4 px-1">
            <h2 className="text-xl font-extrabold">{g.title}</h2>
            <p className="text-sm text-muted">{g.sub}</p>
          </header>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.members.map((l) => (
              <LevelCard key={l} level={l} compact={compact} lastSessionAt={levels?.[l].lastSessionAt} lastScore={levels?.[l].lastScore} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
