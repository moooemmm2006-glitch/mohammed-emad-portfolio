"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { fill, localeOf, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { BADGES, type FocusStats } from "@/lib/focusShared";

/** "💰 خزنتي" on تقدّمي: all ⏱️ focus time, today / 7 days, the streak, a 7-day chart and the badges. */
export function VaultCard() {
  const { t, lang } = useUI();
  const [stats, setStats] = useState<FocusStats | null>(null);
  useEffect(() => {
    api<FocusStats>(`/api/focus/stats?tz=${new Date().getTimezoneOffset()}`).then(setStats, () => {});
  }, []);
  if (!stats) return null;

  const hm = (min: number) => (min < 60 ? fill(t("focus_min"), { n: min }) : fill(t("vault_hm"), { h: Math.floor(min / 60), m: min % 60 }));
  const max = Math.max(1, ...stats.last7.map((d) => d.minutes));
  const dayName = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(localeOf(lang), { weekday: "short" });

  return (
    <section className="card depth p-5 sm:p-6 space-y-4" data-testid="vault-card">
      <h2 className="text-lg font-bold">{t("vault_title")}</h2>
      {stats.sessions === 0 && <p className="text-sm text-muted">{t("vault_empty")}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            ["💰", hm(stats.totalMinutes), "vault_total"],
            ["☀️", hm(stats.todayMinutes), "vault_today"],
            ["📅", hm(stats.weekMinutes), "vault_week"],
            ["🔥", String(stats.streak), "vault_streak"],
          ] as const
        ).map(([icon, value, key]) => (
          <div key={key} className="rounded-2xl bg-surface-2 p-3">
            <div className="text-xl font-extrabold tabular-nums">
              <span aria-hidden="true">{icon}</span> {value}
            </div>
            <div className="text-xs text-muted">{t(key)}</div>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2 h-28" dir="ltr" role="img" aria-label={stats.last7.map((d) => `${dayName(d.day)}: ${d.minutes}`).join(", ")}>
        {stats.last7.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <span className="text-[10px] text-muted tabular-nums">{d.minutes || ""}</span>
            <span className="w-full max-w-8 rounded-t-md" style={{ height: `${Math.max(4, (d.minutes / max) * 80)}px`, background: d.minutes ? "linear-gradient(#ffd34d,#e6a100)" : "var(--line)" }} />
            <span className="text-[10px] text-muted">{dayName(d.day)}</span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">{t("vault_badges")}</h3>
        <ul className="flex flex-wrap gap-2">
          {BADGES.map((b) => {
            const has = stats.badges.includes(b.id);
            return (
              <li key={b.id} className={`rounded-full px-3 py-1 text-sm border ${has ? "border-[#ffc61a]/60 bg-[#ffc61a]/15 font-bold" : "border-line text-muted opacity-60 grayscale"}`}>
                <span aria-hidden="true">{has ? b.emoji : "🔒"}</span> {t(`badge_${b.id}` as TKey)}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
