"use client";

import { levelPath } from "@/lib/paths";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { fill, type TKey, localeOf } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { Level } from "@/lib/levels";
import { IconRepeat } from "../Icons";

interface Overview {
  levels: { level: Level; topics: number; done: number; sentences: number; correct: number; started: { number: number; title_ar: string; correct: number; total: number; done: boolean }[] }[];
  due: number;
  practice: { id: string; topic: number | null; mode: string; createdAt: number; total: number; correct: number }[];
}

/** "تقدّمي": book topics finished per level, today's review and recent practice runs. */
export function BookProgressCard() {
  const { t, lang } = useUI();
  const [o, setO] = useState<Overview | null>(null);
  useEffect(() => {
    api<Overview>("/api/book/overview").then(setO, () => {});
  }, []);
  if (!o) return null;

  return (
    <section className="card p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">📖 {t("prog_book")} — Sprich Deutsch</h2>
        {o.due > 0 && (
          <Link href="/review" className="btn btn-primary !min-h-[40px] text-sm">
            <IconRepeat size={16} /> {t("book_review_title")} ({o.due})
          </Link>
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {o.levels.map((l) => (
          <li key={l.level} className={`level-${l.level.toLowerCase()} rounded-2xl bg-surface-2 p-4 space-y-2`}>
            <Link href={levelPath(l.level)} className="flex items-center gap-2 font-bold">
              <span className="rounded-full px-2 py-0.5 text-xs text-white bg-accent de">{l.level}</span>
              {t(`lvl_${l.level}_name` as TKey)}
            </Link>
            <div className="h-2 rounded-full bg-surface overflow-hidden" aria-hidden="true">
              <div className="h-full bg-accent" style={{ width: `${Math.round((100 * l.correct) / l.sentences)}%` }} />
            </div>
            <p className="text-sm">
              ✓ {fill(t("prog_book_topics"), { d: l.done, t: l.topics })} · {fill(t("prog_book_sentences"), { c: l.correct })}
            </p>
          </li>
        ))}
      </ul>
      {o.practice.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted mb-2">{t("prog_book_recent")}</h3>
          <ul className="divide-y divide-line">
            {o.practice.map((p) => (
              <li key={p.id}>
                <Link href={`/reports/practice/${p.id}`} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-surface-2 text-sm">
                  <span className="flex-1 min-w-0">
                    {t(`mode_${p.mode}` as TKey)}
                    {p.topic ? ` · #${p.topic}` : ""}
                    <span className="block text-xs text-muted">{new Date(p.createdAt).toLocaleString(localeOf(lang), { dateStyle: "medium", timeStyle: "short" })}</span>
                  </span>
                  <b className="tabular-nums shrink-0">
                    {p.correct}/{p.total}
                  </b>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
