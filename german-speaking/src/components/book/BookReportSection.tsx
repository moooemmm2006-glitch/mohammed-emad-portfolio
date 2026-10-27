"use client";

import Link from "next/link";
import { fill } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { BookReport } from "@/lib/report/book";

/** Report section for a guided book conversation: book sentences said wrong, with the book's version. */
export function BookReportSection({ book, level }: { book: BookReport; level: string }) {
  const { t } = useUI();
  return (
    <section className="card p-5 sm:p-6 space-y-3 border-s-4 border-s-[var(--accent)]">
      <div>
        <h2 className="text-lg font-bold">
          📖 {t("rep_book_title")} ·{" "}
          <Link href={`/speak/${level}/topic/${book.topic}`} className="underline">
            #{book.topic} {book.title_ar}
          </Link>
        </h2>
        <p className="text-sm text-muted">
          {t("rep_book_sub")} · {fill(t("rep_book_correct"), { n: book.correct })}
        </p>
      </div>
      {book.items.length === 0 && <p className="text-ok font-semibold">{t("rep_book_none")}</p>}
      <ul className="space-y-3">
        {book.items.map((it, i) => (
          <li key={i} className="rounded-2xl border border-line p-4 space-y-1.5">
            <p className="text-sm">
              <span className="text-muted">{t("prep_said")}: </span>
              <span dir="ltr" lang="de" className={`de ${it.kind === "fix" ? "text-danger" : ""}`}>
                {it.said}
              </span>
            </p>
            <p>
              <span className="text-sm text-muted">{it.kind === "fix" ? t("rep_book_fix") : t("rep_book_tip")}: </span>
              <span dir="ltr" lang="de" className="de font-bold text-ok">
                {it.de}
              </span>
            </p>
            <p className="text-sm text-muted">{it.ar}</p>
            {it.grammar && (
              <p className="text-sm rounded-xl bg-accent-soft px-3 py-2">
                <b>{t("prep_grammar")}:</b> {it.grammar.title_ar} —{" "}
                <span dir="ltr" className="de">
                  {it.grammar.formula}
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
