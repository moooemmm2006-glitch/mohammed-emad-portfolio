"use client";

import { useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/client/ui";

// 🌍 Where German can take you: a calm ticker of well-known companies that hire German speakers in
// Egypt (customer service / BPO and tech), as motivation, not job ads. Each name has its logo next to
// it: a local file in public/logos/ (logo) or else the icon of the company's own website (domain),
// loaded by the visitor's browser; if that can't load, a plain initials mark.

export type CareerCompany = { name: string; mark: string; logo?: string; domain?: string };

export const CAREER_COMPANIES: CareerCompany[] = [
  { name: "Concentrix", mark: "C", domain: "concentrix.com" },
  { name: "Teleperformance (TP)", mark: "TP", domain: "tp.com" },
  { name: "Foundever", mark: "F", domain: "foundever.com" },
  { name: "Sutherland", mark: "S", domain: "sutherlandglobal.com" },
  { name: "TELUS Digital", mark: "T", domain: "telusdigital.com" },
  { name: "_VOIS (Vodafone)", mark: "V", logo: "vodafone.svg" },
  { name: "Raya CX", mark: "R", domain: "rayacx.com" },
  { name: "IBM", mark: "IBM", logo: "ibm.svg" },
];

const siteIcon = (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;

function Logo({ c }: { c: CareerCompany }) {
  const [broken, setBroken] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // An icon that failed before the page came to life never fires onError: check it once mounted.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth === 0) setBroken(true);
  }, []);
  const src = c.logo ? `/logos/${c.logo}` : c.domain ? siteIcon(c.domain) : null;
  if (src && !broken) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny icons, no optimisation needed
    return <img ref={img} src={src} alt="" className="h-6 w-auto max-w-[3.5rem] rounded object-contain" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
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
