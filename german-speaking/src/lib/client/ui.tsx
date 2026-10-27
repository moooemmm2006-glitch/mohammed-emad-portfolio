"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DICT, type TKey, type UILang } from "./i18n";

type Theme = "light" | "dark";

interface UICtx {
  lang: UILang;
  theme: Theme;
  setLang: (l: UILang) => void;
  setTheme: (t: Theme) => void;
  t: (k: TKey) => string;
}

const Ctx = createContext<UICtx | null>(null);

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode etc. — the setting just won't persist
  }
}

// Inline script for <head>: applies language/theme before first paint (no flash).
export const PREPAINT_SCRIPT = `(function(){try{var l=localStorage.getItem('gs.lang')||'ar';var t=localStorage.getItem('gs.theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var h=document.documentElement;h.lang=l;h.dir=l==='ar'?'rtl':'ltr';if(t==='dark')h.classList.add('dark');}catch(e){}})();`;

export function UIProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UILang>("ar");
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setLangState(read<UILang>("gs.lang", "ar"));
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setLang = useCallback((l: UILang) => {
    setLangState(l);
    write("gs.lang", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    write("gs.theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  const value = useMemo<UICtx>(() => ({ lang, theme, setLang, setTheme, t: (k) => DICT[lang][k] ?? DICT.ar[k] ?? k }), [lang, theme, setLang, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI(): UICtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI outside UIProvider");
  return c;
}
