"use client";

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
            <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white bg-accent de">{s.level}</span>
            <span className="text-sm">
              {new Date(s.startedAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
              {s.topic && <span className="block text-xs text-muted de">{s.topic}</span>}
            </span>
            <span className="ms-auto text-sm text-muted">
              {t("info_turns")}: {s.userTurns}
            </span>
            {s.overall != null ? <b className="tabular-nums w-10 text-end">{s.overall}</b> : <span className="text-xs text-gold">{t("reports_pending")}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
