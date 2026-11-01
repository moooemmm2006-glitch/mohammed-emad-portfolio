"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useUI } from "@/lib/client/ui";
import type { UILang } from "@/lib/client/i18n";

// Small building blocks shared by the public pages (landing, about, FAQ, legal).

export type Tri = { ar: string; de: string; en: string };
export const useTr = () => {
  const { lang } = useUI();
  return (o: Tri) => o[lang as UILang] ?? o.ar;
};

/** The brand mark: "SD" on the brand blue with a German-flag stripe. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span className="relative inline-grid place-items-center overflow-hidden rounded-[22%] bg-[#1f3a5f] text-white font-extrabold de shrink-0" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      <span style={{ marginTop: -size * 0.06 }}>SD</span>
      <span className="absolute inset-x-0 bottom-0 flex" style={{ height: Math.max(3, size * 0.13) }} dir="ltr">
        <i className="flex-1 bg-[#111]" />
        <i className="flex-1 bg-[#dd0000]" />
        <i className="flex-1 bg-[#ffce00]" />
      </span>
    </span>
  );
}

export function Eyebrow({ children, color = "#0f766e" }: { children: ReactNode; color?: string }) {
  return (
    <p className="text-xs font-bold tracking-[0.2em] uppercase de" style={{ color }} lang="de">
      {children}
    </p>
  );
}

/** A centred page with a title block — for about / FAQ / legal / test. */
export function PublicPage({ eyebrow, title, intro, children, testid }: { eyebrow: string; title: string; intro?: string; children: ReactNode; testid?: string }) {
  return (
    <article className="max-w-4xl mx-auto space-y-8 pb-6" data-testid={testid}>
      <header className="relative overflow-hidden rounded-[2rem] border border-line bg-surface p-6 sm:p-10 shadow-[var(--shadow)]">
        <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#0f766e,transparent 70%)" }} aria-hidden="true" />
        <div className="relative">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold leading-tight">{title}</h1>
          {intro && <p className="mt-3 text-base sm:text-lg text-muted leading-relaxed max-w-2xl">{intro}</p>}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1.5 flex" dir="ltr" aria-hidden="true">
          <span className="flex-1 bg-[#111]" />
          <span className="flex-1 bg-[#dd0000]" />
          <span className="flex-1 bg-[#ffce00]" />
        </div>
      </header>
      {children}
    </article>
  );
}

/** "Start now" band used at the end of public pages. */
export function StartBand() {
  const tr = useTr();
  return (
    <section className="rounded-[2rem] p-6 sm:p-10 text-center text-white" style={{ background: "linear-gradient(135deg, #1f3a5f, #0f766e)" }}>
      <h2 className="text-2xl sm:text-3xl font-extrabold">{tr({ ar: "جاهز تبدأ؟", de: "Bereit?", en: "Ready to start?" })}</h2>
      <p className="mt-2 opacity-85">{tr({ ar: "اعمل حساب مجاني في دقيقة وابدأ على طول.", de: "Kostenloses Konto in einer Minute – und los geht’s.", en: "Create a free account in a minute and get going." })}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <Link href="/signup" className="btn !min-h-[48px] !px-6 bg-white !text-[#1f3a5f] hover:brightness-95">
          {tr({ ar: "اعمل حساب مجاني", de: "Kostenloses Konto", en: "Create a free account" })}
        </Link>
      </div>
    </section>
  );
}

/** Links shown in the footer on every page. */
export function FooterLinks() {
  const tr = useTr();
  const links: [string, Tri][] = [
    ["/about", { ar: "عن Sprich Deutsch", de: "Über uns", en: "About" }],
    ["/faq", { ar: "الأسئلة الشائعة", de: "FAQ", en: "FAQ" }],
    ["/reviews", { ar: "الريفيوز", de: "Bewertungen", en: "Reviews" }],
    ["/privacy", { ar: "الخصوصية", de: "Datenschutz", en: "Privacy" }],
    ["/terms", { ar: "الشروط", de: "Nutzungsbedingungen", en: "Terms" }],
  ];
  return (
    <nav aria-label="Sprich Deutsch" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
      {links.map(([href, label]) => (
        <a key={href} href={href} className="text-muted hover:text-ink underline-offset-4 hover:underline min-h-[36px] inline-flex items-center">
          {tr(label)}
        </a>
      ))}
    </nav>
  );
}
