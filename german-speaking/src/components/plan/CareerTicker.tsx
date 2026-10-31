"use client";

import { useUI } from "@/lib/client/ui";

// 🌍 Where German can take you: a calm ticker of well-known companies that hire German speakers in
// Egypt (customer service / BPO and tech). Each company shows in its own brand colour with a simple
// initials mark of ours (not the company's logo, which is its trademark), as motivation, not job ads.

export type CareerCompany = { name: string; mark: string; color: string };

export const CAREER_COMPANIES: CareerCompany[] = [
  { name: "Concentrix", mark: "C", color: "#0A3161" },
  { name: "Teleperformance (TP)", mark: "TP", color: "#4A2382" },
  { name: "Foundever", mark: "F", color: "#5F2EEA" },
  { name: "Sutherland", mark: "S", color: "#00539B" },
  { name: "TELUS Digital", mark: "T", color: "#4B286D" },
  { name: "_VOIS (Vodafone)", mark: "V", color: "#E60000" },
  { name: "Raya CX", mark: "R", color: "#C8102E" },
  { name: "IBM", mark: "IBM", color: "#0F62FE" },
];

export function CareerTicker() {
  const { t } = useUI();
  const row = (hidden: boolean) => (
    <ul className="career-ticker-row flex shrink-0 items-center gap-4 pe-4 py-1" aria-hidden={hidden || undefined}>
      {CAREER_COMPANIES.map((c) => (
        <li
          key={c.name}
          className="flex items-center gap-3 whitespace-nowrap rounded-2xl ps-2 pe-5 py-2 text-base sm:text-lg font-extrabold tracking-wide text-white shadow-md"
          style={{ backgroundColor: c.color }}
        >
          <span className="grid place-items-center h-9 min-w-9 sm:h-10 sm:min-w-10 px-1.5 rounded-xl bg-white text-sm sm:text-base font-black" style={{ color: c.color }} aria-hidden="true">
            {c.mark}
          </span>
          {c.name}
        </li>
      ))}
    </ul>
  );
  return (
    <section className="card p-5 sm:p-6 space-y-4 overflow-hidden" aria-labelledby="career-title" data-testid="career-ticker">
      <div>
        <h2 id="career-title" className="font-extrabold text-xl sm:text-2xl">
          {t("career_title")}
        </h2>
        <p className="text-sm sm:text-base text-muted">{t("career_sub")}</p>
      </div>
      <div className="career-ticker relative flex overflow-hidden" dir="ltr" lang="en">
        {row(false)}
        {row(true)}
      </div>
      <p className="text-xs text-muted">{t("career_note")}</p>
    </section>
  );
}
