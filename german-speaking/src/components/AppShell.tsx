"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useUI } from "@/lib/client/ui";
import type { TKey } from "@/lib/client/i18n";
import { IconBook, IconChart, IconFile, IconGear, IconHome, IconMenu, IconMic, IconMoon, IconSun, IconX } from "./Icons";

const MAIN: { href: string; key: TKey; icon: (p: { size?: number }) => ReactNode }[] = [
  { href: "/", key: "nav_home", icon: IconHome },
  { href: "/speak", key: "nav_speak", icon: IconMic },
  { href: "/progress", key: "nav_progress", icon: IconChart },
  { href: "/reports", key: "nav_reports", icon: IconFile },
  { href: "/settings", key: "nav_settings", icon: IconGear },
];

export const SOON: { slug: string; key: TKey; de: string }[] = [
  { slug: "vokabeln", key: "soon_vokabeln", de: "Vokabeln" },
  { slug: "grammatik", key: "soon_grammatik", de: "Grammatik" },
  { slug: "hoeren", key: "soon_hoeren", de: "Hören" },
  { slug: "lesen", key: "soon_lesen", de: "Lesen" },
  { slug: "schreiben", key: "soon_schreiben", de: "Schreiben" },
  { slug: "pruefungen", key: "soon_pruefungen", de: "Prüfungen" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang, theme, setTheme } = useUI();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  // The speaking screen is full-screen: no site nav on mobile, no page padding.
  const inConversation = /^\/speak\/(A1|A2|B1|B2)/i.test(path);

  useEffect(() => setMenu(false), [path]);

  return (
    <div className="min-h-dvh flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 btn btn-primary">
        {lang === "ar" ? "انتقل للمحتوى" : "Skip to content"}
      </a>
      <header className={`sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur ${inConversation ? "hidden md:block" : ""}`}>
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand text-brand-ink" aria-hidden="true">
              <IconMic size={18} />
            </span>
            <span className="leading-tight">
              {t("appName")}
              <span className="block text-xs font-medium text-muted de">{t("appTagline")}</span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:flex items-center gap-1 ms-6">
            {MAIN.slice(1).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(path, n.href) ? "page" : undefined}
                className="px-3 py-2 rounded-full text-sm font-medium text-muted hover:text-ink hover:bg-surface-2 aria-[current=page]:text-ink aria-[current=page]:bg-surface-2"
              >
                {t(n.key)}
              </Link>
            ))}
            <SoonMenu />
          </nav>

          <div className="ms-auto flex items-center gap-1">
            <button className="btn btn-ghost !px-3 !min-h-[40px] text-sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")} aria-label="Language">
              {t("lang_toggle")}
            </button>
            <button
              className="btn btn-ghost !px-3 !min-h-[40px]"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={t("theme_toggle")}
            >
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>
            <button className="btn btn-ghost !px-3 !min-h-[40px] md:hidden" onClick={() => setMenu(true)} aria-label={t("nav_more")} aria-expanded={menu}>
              <IconMenu />
            </button>
          </div>
        </div>
      </header>

      {menu && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label={t("nav_more")}>
          <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 end-0 w-72 max-w-[85vw] bg-surface p-5 shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold">{t("nav_more")}</span>
              <button className="btn btn-ghost !px-2 !min-h-[36px]" onClick={() => setMenu(false)} aria-label="Close">
                <IconX />
              </button>
            </div>
            <ul className="space-y-1">
              {MAIN.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-2" aria-current={isActive(path, n.href) ? "page" : undefined}>
                    <n.icon size={20} /> {t(n.key)}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("nav_soon")}</p>
            <ul className="space-y-1">
              {SOON.map((s) => (
                <li key={s.slug}>
                  <Link href={`/soon/${s.slug}`} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-2 text-muted">
                    <span>
                      {t(s.key)} · <span className="de">{s.de}</span>
                    </span>
                    <span className="text-[11px] rounded-full px-2 py-0.5 bg-surface-2">{t("nav_soon")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <main id="main" className={inConversation ? "flex-1 w-full" : "flex-1 mx-auto w-full max-w-6xl px-4 pb-28 md:pb-12 pt-6"}>
        {children}
      </main>

      {!inConversation && (
        <nav aria-label="Main mobile" className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <ul className="grid grid-cols-5">
            {MAIN.map((n) => {
              const active = isActive(path, n.href);
              const center = n.href === "/speak";
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-ink font-semibold" : "text-muted"}`}
                  >
                    <span className={center ? "grid place-items-center w-11 h-11 -mt-5 rounded-full bg-brand text-brand-ink shadow-card" : ""}>
                      <n.icon size={center ? 22 : 20} />
                    </span>
                    {t(n.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

function SoonMenu() {
  const { t } = useUI();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        className="px-3 py-2 rounded-full text-sm font-medium text-muted hover:text-ink hover:bg-surface-2 inline-flex items-center gap-1"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <IconBook size={16} /> {t("nav_soon")}
      </button>
      {open && (
        <ul role="menu" className="absolute top-full mt-2 start-0 w-60 card p-2 z-40">
          {SOON.map((s) => (
            <li key={s.slug} role="none">
              <Link role="menuitem" href={`/soon/${s.slug}`} className="flex justify-between px-3 py-2 rounded-lg hover:bg-surface-2 text-sm" onClick={() => setOpen(false)}>
                <span>{t(s.key)}</span>
                <span className="de text-muted">{s.de}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
