"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useUI } from "@/lib/client/ui";
import { api } from "@/lib/client/api";
import { PUBLIC_PATHS, useMe } from "@/lib/client/me";
import { UI_LANGS, type UILang } from "@/lib/client/i18n";
import { isLevel, LEVEL_CONFIG, LEVELS, type Level } from "@/lib/levels";
import { LEVEL_COOKIE, levelPath } from "@/lib/paths";
import { IconMoon, IconSun } from "./Icons";
import { FocusButton, FocusController } from "./focus/FocusTimer";
import { ProfileMenu } from "./ProfileMenu";
import { SiteFooter } from "./site/CreatorCard";
import { useSite } from "./site/SiteProvider";

export const SOON: { slug: string; key: "soon_vokabeln" | "soon_grammatik" | "soon_hoeren" | "soon_lesen" | "soon_schreiben" | "soon_pruefungen" }[] = [
  { slug: "vokabeln", key: "soon_vokabeln" },
  { slug: "grammatik", key: "soon_grammatik" },
  { slug: "hoeren", key: "soon_hoeren" },
  { slug: "lesen", key: "soon_lesen" },
  { slug: "schreiben", key: "soon_schreiben" },
  { slug: "pruefungen", key: "soon_pruefungen" },
];

/** The level the current page belongs to (/level/a1/…), if any. */
export function levelFromPath(path: string): Level | null {
  const code = path.match(/^\/level\/([a-z0-9]+)/i)?.[1]?.toUpperCase();
  return isLevel(code) ? code : null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useUI();
  const path = usePathname();
  const { me, loading } = useMe();
  const communityUserId = me?.user.id;
  // Login and sign-up: language and theme only.
  const bare = PUBLIC_PATHS.includes(path);
  const mobileNav = !bare && !!me && !path.startsWith("/community/rooms/");
  const active = levelFromPath(path);

  useEffect(() => {
    if (!communityUserId) return;
    const beat = () => { void api("/api/community/presence", { method: "POST" }).catch(() => {}); };
    beat();
    const timer = window.setInterval(beat, 20_000);
    return () => window.clearInterval(timer);
  }, [communityUserId]);

  // Remember the level for "/" (start page = last level).
  useEffect(() => {
    if (active) document.cookie = `${LEVEL_COOKIE}=${active.toLowerCase()}; path=/; max-age=31536000; samesite=lax`;
  }, [active]);

  // The page background takes the level's colour (animated through the registered --level-c property).
  const style = { "--level-c": active ? LEVEL_CONFIG[active].accent : "#64748b" } as CSSProperties;

  return (
    <div className="app-bg min-h-dvh flex flex-col" style={style}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 btn btn-primary">
        {t("skip_content")}
      </a>
      <header className="glass-header sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-2 sm:py-0 sm:h-16 flex flex-wrap items-center gap-x-2 gap-y-1">
          {!bare && <div className="w-full min-w-0 sm:w-auto"><LevelNav active={active} communityActive={path.startsWith("/community")} cafeActive={path.startsWith("/sprachcafe")} /></div>}
          <div className="ms-auto flex items-center gap-1 shrink-0">
            <LangSwitcher />
            <ExplainerButton />
            {!bare && me && <FocusButton />}
            <ThemeButton />
            {me ? (
              <ProfileMenu />
            ) : (
              !loading &&
              path !== "/login" && (
                <Link href="/login" className="btn btn-primary !min-h-[38px] !px-3 text-sm">
                  {t("login_button")}
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      <main id="main" className={`flex-1 mx-auto w-full max-w-7xl px-4 ${mobileNav ? "pb-24 md:pb-12" : "pb-12"} pt-5`}>
        {children}
      </main>
      <SiteFooter loggedIn={!bare && !!me} minimal={/^\/level\/[a-z0-9]+\/?$/i.test(path)} />
      {mobileNav && <MobilePrimaryNav path={path} active={active} />}
      {!bare && me && <FocusController />}
    </div>
  );
}

/** ▶️ "شرح الموقع": the one small header button for the explainer video (only when it exists). */
function ExplainerButton() {
  const { t } = useUI();
  const { links, openExplainer } = useSite();
  if (!links.explainerId) return null;
  return (
    <button type="button" className="btn btn-ghost !px-0 w-[38px] sm:w-10 !min-h-[38px] sm:!min-h-[40px] text-base" aria-label={t("yt_explainer_short")} title={t("yt_explainer_short")} onClick={openExplainer}>
      <span aria-hidden="true">▶️</span>
    </button>
  );
}

/** "المستوى" + the four level pills; the highlight slides to the active level. */
function LevelNav({ active, communityActive, cafeActive }: { active: Level | null; communityActive: boolean; cafeActive: boolean }) {
  const { t } = useUI();
  return (
    <nav aria-label={t("header_level")} className="flex items-center gap-1.5 sm:gap-3 min-w-0 overflow-x-auto">
      <span className="font-extrabold text-sm sm:text-2xl leading-none whitespace-nowrap">{t("header_level")}</span>
      <div className="flex items-center gap-0.5 sm:gap-1 rounded-full bg-surface-2/70 p-0.5 sm:p-1 shadow-inner">
        {LEVELS.map((l) => {
          const on = l === active;
          const accent = LEVEL_CONFIG[l].accent;
          return (
            <Link
              key={l}
              href={levelPath(l)}
              aria-current={on ? "page" : undefined}
              className="level-pill relative inline-grid place-items-center min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 rounded-full px-2 sm:px-3.5 py-1 sm:py-1.5 text-sm sm:text-base font-extrabold de"
              style={{ color: on ? "#fff" : accent }}
            >
              {on && <m.span layoutId="level-pill" className="absolute inset-0 rounded-full shadow-md" style={{ background: accent }} transition={{ type: "spring", stiffness: 480, damping: 38 }} />}
              <span className="relative z-10">{l}</span>
            </Link>
          );
        })}
      </div>
      <Link href="/community" aria-label={t("community_nav")} aria-current={communityActive ? "page" : undefined} className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2 xl:px-3 py-2 text-sm font-bold transition ${communityActive ? "bg-emerald-600 text-white" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}>
        <span aria-hidden="true">👥</span><span>{t("community_nav")}</span>
      </Link>
      <Link href="/sprachcafe" aria-label={t("cafe_nav")} aria-current={cafeActive ? "page" : undefined} className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2 xl:px-3 py-2 text-sm font-bold transition ${cafeActive ? "bg-amber-500 text-slate-950" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}>
        <span aria-hidden="true">☕</span><span>{t("cafe_nav")}</span>
      </Link>
    </nav>
  );
}

function MobilePrimaryNav({ path, active }: { path: string; active: Level | null }) {
  const { t, lang } = useUI();
  const items = [
    { href: active ? levelPath(active) : "/", label: t("nav_levels"), icon: "📚", selected: Boolean(active) || path === "/" },
    { href: "/community", label: t("community_nav"), icon: "👥", selected: path.startsWith("/community") },
    { href: "/sprachcafe", label: t("cafe_nav"), icon: "☕", selected: path.startsWith("/sprachcafe") },
    { href: "/grammar", label: t("nav_grammar"), icon: "📘", selected: path.startsWith("/grammar") },
  ];
  return (
    <nav aria-label={t("mobile_nav_label")} dir={lang === "ar" ? "rtl" : "ltr"} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 pt-1.5">
        {items.map((item) => <li key={item.href}>
          <Link href={item.href} aria-current={item.selected ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold leading-tight transition ${item.selected ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}>
            <span aria-hidden="true" className="text-base">{item.icon}</span><span className="max-w-full truncate">{item.label}</span>
          </Link>
        </li>)}
      </ul>
    </nav>
  );
}

const LANG_SHORT: Record<UILang, string> = { ar: "ع", de: "DE", en: "EN" };
const LANG_NAME_KEY = { ar: "lang_name_ar", de: "lang_name_de", en: "lang_name_en" } as const;

/** Three interface languages: العربية · Deutsch · English. */
function LangSwitcher() {
  const { t, lang, setLang } = useUI();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        className="btn btn-ghost !px-2.5 !min-h-[38px] sm:!min-h-[40px] text-sm font-bold"
        aria-label={t("lang_switch")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {LANG_SHORT[lang]}
      </button>
      {open && (
        <ul role="menu" aria-label={t("lang_switch")} className="absolute top-full mt-2 end-0 z-50 w-40 card p-1.5">
          {UI_LANGS.map((l) => (
            <li key={l} role="none">
              <button
                role="menuitemradio"
                aria-checked={l === lang}
                lang={l}
                dir={l === "ar" ? "rtl" : "ltr"}
                className="w-full text-start px-3 py-2 rounded-lg hover:bg-surface-2 aria-checked:font-bold flex items-center justify-between"
                onClick={() => {
                  setLang(l);
                  setOpen(false);
                }}
              >
                {t(LANG_NAME_KEY[l])}
                {l === lang && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ThemeButton() {
  const { t, theme, setTheme } = useUI();
  return (
    <button className="btn btn-ghost !px-2.5 !min-h-[38px] sm:!min-h-[40px]" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={t("theme_toggle")}>
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </button>
  );
}
