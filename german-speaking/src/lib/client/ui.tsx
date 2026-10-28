"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dirOf, isUILang, LANG_COOKIE, loadMessages, localeOf, type Messages, type TKey, type UILang } from "./i18n";

type Theme = "light" | "dark";

interface UICtx {
  lang: UILang;
  theme: Theme;
  /** For dates and numbers. */
  locale: string;
  setLang: (l: UILang, opts?: { save?: boolean }) => void;
  setTheme: (t: Theme) => void;
  t: (k: TKey) => string;
  /** Label of a grammar tag (tag_<name>) in the interface language. */
  tag: (name: string) => string;
}

const Ctx = createContext<UICtx | null>(null);

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode etc. — the setting just won't persist
  }
}

// Inline script for <head>: applies the theme before first paint (no flash). Language/direction come from the cookie on the server.
export const PREPAINT_SCRIPT = `(function(){try{var t=localStorage.getItem('gs.theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export function UIProvider({ children, initialLang = "ar", messages }: { children: ReactNode; initialLang?: UILang; messages: Messages }) {
  // Only the active language's messages are in the page; another one is loaded when switching.
  const [{ lang, msgs }, setState] = useState<{ lang: UILang; msgs: Messages }>({ lang: initialLang, msgs: messages });
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setLang = useCallback((l: UILang, opts: { save?: boolean } = {}) => {
    if (!isUILang(l)) return;
    void loadMessages(l).then((m) => {
      setState({ lang: l, msgs: m });
      write("gs.lang", l);
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
      document.documentElement.dir = dirOf(l);
    });
    // Saved with the account too (ignored when logged out).
    if (opts.save !== false) void fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uiLang: l }) }).catch(() => {});
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    write("gs.theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  const value = useMemo<UICtx>(
    () => ({
      lang,
      theme,
      locale: localeOf(lang),
      setLang,
      setTheme,
      t: (k) => msgs[k] ?? k,
      tag: (name) => (msgs as Record<string, string>)[`tag_${name}`] ?? name.replace(/_/g, " "),
    }),
    [lang, msgs, theme, setLang, setTheme],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI(): UICtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI outside UIProvider");
  return c;
}

