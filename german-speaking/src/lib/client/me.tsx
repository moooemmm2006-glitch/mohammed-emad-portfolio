"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "../auth/users";
import { ApiError, api } from "./api";
import type { TKey, UILang } from "./i18n";
import { useUI } from "./ui";

// The logged-in user, shared by the header circle, the admin page and anything else that needs it.

export interface Me {
  user: PublicUser;
  lastLevel: string | null;
  streak: number;
  prefs?: { uiLang: UILang; effects: "auto" | "on" | "mild" | "off" };
}

interface MeCtx {
  me: Me | null;
  /** true until the first answer from the server */
  loading: boolean;
  reload: () => Promise<void>;
  setUser: (patch: Partial<PublicUser>) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<MeCtx | null>(null);
export const PUBLIC_PATHS = ["/login", "/signup"];

export function MeProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isPublic = PUBLIC_PATHS.includes(path);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const { setLang } = useUI();

  const reload = useCallback(async () => {
    try {
      const m = await api<Me>(`/api/me?tz=${new Date().getTimezoneOffset()}`);
      setMe(m);
      // The language saved with the account wins on a new device.
      if (m.prefs?.uiLang && m.prefs.uiLang !== document.documentElement.lang) setLang(m.prefs.uiLang, { save: false });
    } catch (err) {
      setMe(null);
      // A signed cookie whose account was disabled or whose password changed: clear it and go to login.
      if (err instanceof ApiError && err.status === 401 && !PUBLIC_PATHS.includes(location.pathname)) {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
      }
    } finally {
      setLoading(false);
    }
  }, [setLang]);

  useEffect(() => {
    if (isPublic) {
      setMe(null);
      setLoading(false);
    } else void reload();
  }, [isPublic, reload]);

  const setUser = useCallback((patch: Partial<PublicUser>) => setMe((m) => (m ? { ...m, user: { ...m.user, ...patch } } : m)), []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setMe(null);
    location.href = "/login";
  }, []);

  return <Ctx.Provider value={{ me, loading, reload, setUser, logout }}>{children}</Ctx.Provider>;
}

export function useMe(): MeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMe outside MeProvider");
  return c;
}

/** The translated message for an account API error ("autherr_<code>" in the dictionary). */
export function authErrorText(err: unknown, t: (k: TKey) => string): string {
  const code = err instanceof ApiError ? err.code : "server_error";
  const key = `autherr_${code}`;
  const known = t(key as TKey);
  const text = known !== key ? known : t("autherr_server_error");
  return code === "rate_limited" ? text.replace("{n}", /^\d+$/.test((err as ApiError).message) ? (err as ApiError).message : "15") : text;
}

/** Only same-site paths, so ?next= can't send people to another website. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
