"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { fill, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";
import { levelPath } from "@/lib/paths";
import type { SkillProgress } from "@/lib/skills";
import { ProgressBar } from "./shared";

const SKILLS = [
  { id: "speak", emoji: "🗣️", key: "skill_speak_short" },
  { id: "listen", emoji: "🎧", key: "skill_listen_short" },
  { id: "read", emoji: "📖", key: "skill_read_short" },
  { id: "write", emoji: "✍️", key: "skill_write_short" },
] as const;

/** "تقدّمي": the four skills for every level. */
export function SkillsProgressCard() {
  const { t } = useUI();
  const [levels, setLevels] = useState<(SkillProgress & { level: Level; easyGerman?: { watched: number; total: number } })[] | null>(null);
  useEffect(() => {
    api<{ levels: (SkillProgress & { level: Level; easyGerman?: { watched: number; total: number } })[] }>("/api/progress/skills").then((d) => setLevels(d.levels), () => {});
  }, []);
  if (!levels) return null;
  return (
    <section className="card depth p-5 sm:p-6 space-y-4">
      <h2 className="text-lg font-bold">{t("prog_skills_title")}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {levels.map((l) => {
          const accent = LEVEL_CONFIG[l.level].accent;
          return (
            <li key={l.level} className="rounded-2xl bg-surface-2 p-4 space-y-3">
              <Link href={levelPath(l.level)} className="flex items-center gap-2 font-bold">
                <span className="rounded-full px-2 py-0.5 text-xs text-white de" style={{ background: accent }}>
                  {l.level}
                </span>
                {t(`lvl_${l.level}_name` as TKey)}
              </Link>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {SKILLS.map((s) => (
                  <ProgressBar key={s.id} label={`${s.emoji} ${t(s.key)}`} value={l[s.id]} accent={accent} />
                ))}
              </div>
              {l.easyGerman && l.easyGerman.total > 0 && (
                <p className="text-xs text-muted tabular-nums">🎧 {fill(t("eg_progress"), { n: l.easyGerman.watched, t: l.easyGerman.total })}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
