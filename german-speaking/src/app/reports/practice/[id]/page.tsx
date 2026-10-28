"use client";

import { topicPath } from "@/lib/paths";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconRepeat } from "@/components/Icons";
import { api } from "@/lib/client/api";
import { localeOf, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { CORRECT_AT } from "@/lib/bookCompare";
import type { PracticeRecord } from "@/lib/bookProgress";

type Practice = PracticeRecord & { topicInfo: { number: number; level: string; title_de: string; title_ar: string } | null };

// Report of a "listen & repeat" / review run: sentences to repeat (book version, Arabic, grammar point).
export default function PracticeReportPage() {
  const { t, lang } = useUI();
  const { id } = useParams<{ id: string }>();
  const [rec, setRec] = useState<Practice | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<Practice>(`/api/book/practice/${id}`).then(setRec, () => setError(true));
  }, [id]);

  if (error) return <p className="py-20 text-center text-danger">{t("err_api")}</p>;
  if (!rec) return <p className="py-20 text-center text-muted">{t("loading")}</p>;

  // Keep the best try per sentence.
  const best = new Map<number, (typeof rec.results)[number]>();
  for (const r of rec.results) if (!best.has(r.n) || r.score > best.get(r.n)!.score) best.set(r.n, r);
  const all = [...best.values()];
  const wrong = all.filter((r) => r.score < CORRECT_AT);
  const right = all.length - wrong.length;
  const topic = rec.topicInfo;
  const again = topic ? topicPath(topic.level, topic.number) : "/review";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <header className="card p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[12rem]">
          <p className="text-sm text-muted">
            {t(`mode_${rec.mode}` as TKey)} · {new Date(rec.createdAt).toLocaleString(localeOf(lang), { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <h1 className="text-2xl font-extrabold">{t("prep_title")}</h1>
          {topic && (
            <p className="font-semibold">
              #{topic.number} {topic.title_ar} ·{" "}
              <span dir="ltr" lang="de" className="de text-muted">
                {topic.title_de}
              </span>
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-3xl font-extrabold tabular-nums text-ok">
            {right}/{all.length}
          </p>
          <p className="text-xs text-muted">{t("prep_correct")}</p>
        </div>
      </header>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-bold">
          {t("prep_wrong")} ({wrong.length})
        </h2>
        {wrong.length === 0 && <p className="text-ok font-semibold">{t("prep_all_right")}</p>}
        <ul className="space-y-3">
          {wrong.map((r) => (
            <li key={r.n} className="rounded-2xl border border-line p-4 space-y-1.5">
              <p className="text-sm">
                <span className="text-muted">{t("prep_said")}: </span>
                <span dir="ltr" lang="de" className="de text-danger">
                  {r.said}
                </span>
                <span className="ms-2 text-xs rounded-full bg-danger/10 text-danger px-2 py-0.5 tabular-nums">{r.score}%</span>
              </p>
              <p>
                <span className="text-sm text-muted">{t("prep_book")}: </span>
                <span dir="ltr" lang="de" className="de font-bold text-ok">
                  {r.de}
                </span>
              </p>
              <p className="text-sm text-muted">{r.ar}</p>
              {r.missed.length > 0 && (
                <p className="text-sm">
                  <span className="text-muted">{t("prep_missed")}: </span>
                  <span dir="ltr" lang="de" className="de font-semibold text-danger">
                    {r.missed.join(" · ")}
                  </span>
                </p>
              )}
              {r.grammar && (
                <p className="text-sm rounded-xl bg-accent-soft px-3 py-2">
                  <b>{t("prep_grammar")}:</b> {r.grammar.title_ar} —{" "}
                  <span dir="ltr" className="de">
                    {r.grammar.formula}
                  </span>
                </p>
              )}
            </li>
          ))}
        </ul>
        {wrong.length > 0 && <p className="text-xs text-muted">{t("prep_review_note")}</p>}
      </section>

      <Link href={again} className="btn btn-primary">
        <IconRepeat size={16} /> {t("prep_again")}
      </Link>
    </div>
  );
}
