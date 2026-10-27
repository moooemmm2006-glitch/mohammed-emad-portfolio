"use client";

import Link from "next/link";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";
import { useUI } from "@/lib/client/ui";
import { Avatar } from "./Avatar";
import { IconArrow } from "./Icons";

export function LevelCard({ level, lastSessionAt, lastScore, compact = false }: { level: Level; lastSessionAt?: number | null; lastScore?: number | null; compact?: boolean }) {
  const { t, lang } = useUI();
  const cfg = LEVEL_CONFIG[level];
  const p = cfg.persona;
  return (
    <Link
      href={`/speak/${level}`}
      className={`level-${level.toLowerCase()} card group relative overflow-hidden p-5 flex flex-col gap-4 hover:-translate-y-0.5 transition-transform border-t-4 border-t-[var(--accent)]`}
    >
      <div className="flex items-center gap-4">
        <Avatar level={level} size={compact ? 56 : 68} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-sm font-bold text-white bg-accent de">{level}</span>
            <span className="font-bold text-lg de">{level === "B2" ? "Dr. Tobias" : p.name}</span>
          </div>
          <p className="text-sm text-muted">
            {p.role[lang]} · <span className="de">{p.city}</span>
          </p>
        </div>
      </div>
      {!compact && (
        <>
          <p className="text-[0.95rem]">{p.description[lang]}</p>
          <div className="rounded-xl bg-accent-soft p-3 text-sm">
            <span className="font-semibold text-accent">{t("level_cansay")}: </span>
            {p.canSay[lang]}
          </div>
        </>
      )}
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
          {t("level_start")} <span className="de">{p.name}</span>
          <IconArrow size={16} className="rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}
