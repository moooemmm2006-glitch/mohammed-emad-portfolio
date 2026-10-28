"use client";

import { localeOf } from "@/lib/client/i18n";
import Link from "next/link";
import { useUI } from "@/lib/client/ui";

export function HistoryList({ items }: { items: { id: string; level: string; topic: string | null; startedAt: number; userTurns: number; overall: number | null; hasReport: boolean }[] }) {
  const { t, lang } = useUI();
  if (!items.length) return <p className="text-muted">{t("reports_empty")}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((s) => (
        <li key={s.id} className={`level-${s.level.toLowerCase()}`}>
          <Link href={s.hasReport ? `/reports/${s.id}` : `/reports/${s.id}?generate=1`} className="flex items-center gap-3 py-3 hover:bg-surface-2 rounded-lg px-2">
            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white bg-accent de">{s.level}</span>
            <span className="text-sm min-w-0 flex-1">
              {new Date(s.startedAt).toLocaleString(localeOf(lang), { dateStyle: "medium", timeStyle: "short" })}
              <span className="block text-xs text-muted">
                {s.topic && <span className="de">{s.topic} · </span>}
                {t("info_turns")}: {s.userTurns}
              </span>
            </span>
            {s.overall != null ? <b className="tabular-nums w-10 text-end shrink-0">{s.overall}</b> : <span className="text-xs text-gold shrink-0">{t("reports_pending")}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
