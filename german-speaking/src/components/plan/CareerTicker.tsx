"use client";

import { useUI } from "@/lib/client/ui";

// 🌍 Where German can take you: a calm ticker of well-known companies that hire German speakers in
// Egypt (customer service / BPO and tech). Names only (no logos), as motivation, not job ads.

export const CAREER_COMPANIES = ["Concentrix", "Teleperformance (TP)", "Foundever", "Sutherland", "TELUS Digital", "_VOIS (Vodafone)", "Raya CX", "IBM"];

export function CareerTicker() {
  const { t } = useUI();
  const row = (hidden: boolean) => (
    <ul className="career-ticker-row flex shrink-0 items-center gap-3 pe-3" aria-hidden={hidden || undefined}>
      {CAREER_COMPANIES.map((c) => (
        <li key={c} className="whitespace-nowrap rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-bold tracking-wide">
          {c}
        </li>
      ))}
    </ul>
  );
  return (
    <section className="card p-4 sm:p-5 space-y-3 overflow-hidden" aria-labelledby="career-title" data-testid="career-ticker">
      <div>
        <h2 id="career-title" className="font-extrabold text-lg">
          {t("career_title")}
        </h2>
        <p className="text-sm text-muted">{t("career_sub")}</p>
      </div>
      <div className="career-ticker relative flex overflow-hidden" dir="ltr" lang="en">
        {row(false)}
        {row(true)}
      </div>
      <p className="text-xs text-muted">{t("career_note")}</p>
    </section>
  );
}
