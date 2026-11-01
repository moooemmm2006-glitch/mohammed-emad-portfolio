"use client";

import { useUI } from "@/lib/client/ui";

// 🌍 Where German can take you: a calm ticker of well-known companies that hire German speakers in
// Egypt (customer service / BPO and tech), as motivation, not job ads. Each name has its logo next to
// it when the file is in public/logos/ (logo: the file name); until then a plain initials mark.

export type CareerCompany = { name: string; mark: string; logo?: string };

export const CAREER_COMPANIES: CareerCompany[] = [
  { name: "Concentrix", mark: "C" },
  { name: "Teleperformance (TP)", mark: "TP" },
  { name: "Foundever", mark: "F" },
  { name: "Sutherland", mark: "S" },
  { name: "TELUS Digital", mark: "T" },
  { name: "_VOIS (Vodafone)", mark: "V", logo: "vodafone.svg" },
  { name: "Raya CX", mark: "R" },
  { name: "IBM", mark: "IBM", logo: "ibm.svg" },
];

function Logo({ c }: { c: CareerCompany }) {
  if (c.logo) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny local SVGs, no optimisation needed
    return <img src={`/logos/${c.logo}`} alt="" className="h-6 w-auto max-w-[3.5rem] object-contain" decoding="async" />;
  }
  return (
    <span className="grid place-items-center h-7 min-w-7 px-1 rounded-full bg-surface-2 text-[11px] font-black text-muted" aria-hidden="true">
      {c.mark}
    </span>
  );
}

export function CareerTicker() {
  const { t } = useUI();
  const row = (hidden: boolean) => (
    <ul className="career-ticker-row flex shrink-0 items-center gap-3 pe-3" aria-hidden={hidden || undefined}>
      {CAREER_COMPANIES.map((c) => (
        <li key={c.name} className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-line bg-surface ps-2 pe-4 py-1.5 text-base font-bold tracking-wide">
          <Logo c={c} />
          {c.name}
        </li>
      ))}
    </ul>
  );
  return (
    <section className="card p-4 sm:p-5 space-y-3 overflow-hidden" aria-labelledby="career-title" data-testid="career-ticker">
      <div>
        <h2 id="career-title" className="font-extrabold text-lg sm:text-xl">
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
