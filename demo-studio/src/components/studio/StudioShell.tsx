"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Icon } from "./Icon";
import { LiveActivity } from "./LiveActivity";

type Toast = { id: number; text: string; tone?: "ok" | "err" | "hot"; href?: string };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const NAV = [
  { href: "/studio", label: "النماذج", icon: "grip" },
  { href: "/studio/new", label: "نموذج جديد", icon: "plus" },
  { href: "/studio/import", label: "استيراد CSV", icon: "csv" },
  { href: "/studio/settings", label: "الإعدادات", icon: "settings" },
];

export function StudioShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const path = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), t.tone === "hot" ? 12000 : 3500);
  }, []);

  async function logout() {
    await fetch("/api/studio/logout", { method: "POST" });
    window.location.href = "/studio/login";
  }

  return (
    <MotionConfig reducedMotion="user">
      <ToastCtx.Provider value={push}>
        <header className="sticky top-0 z-40 border-b border-white/[.06] bg-ink/85 backdrop-blur-xl">
          <div className={`mx-auto flex h-16 items-center gap-3 px-4 ${wide ? "max-w-[1600px]" : "max-w-7xl"}`}>
            <Link href="/studio" className="flex items-center gap-2 shrink-0" aria-label="Demo Studio">
              <svg width="30" height="24" viewBox="0 0 40 32" aria-hidden><path fill="#F4F1EA" d="M4 28V4h4l8 11 8-11h4v24h-4V11l-8 11-8-11v17zM24 4h12v4H24zM24 24h12v4H24z" /><path fill="#2E5BFF" d="M30 14h5v4h-5z" /></svg>
              <span className="hidden sm:inline font-semibold" dir="ltr">Demo Studio</span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none ms-2" aria-label="الاستوديو">
              {NAV.map((n) => {
                const active = n.href === "/studio" ? path === "/studio" : path.startsWith(n.href);
                return (
                  <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-sm whitespace-nowrap transition-colors ${active ? "bg-white/[.08] text-ivory" : "text-fg2 hover:text-ivory hover:bg-white/[.04]"}`}>
                    <Icon name={n.icon} size={16} />
                    <span className={n.href === "/studio/new" ? "" : "hidden md:inline"}>{n.label}</span>
                  </Link>
                );
              })}
            </nav>
            <button onClick={logout} className="ms-auto btn btn-ghost btn-sm" aria-label="تسجيل خروج"><Icon name="logout" size={16} /><span className="hidden sm:inline">خروج</span></button>
          </div>
        </header>
        <main className={`mx-auto px-4 py-6 ${wide ? "max-w-[1600px]" : "max-w-7xl"}`}>{children}</main>
        <LiveActivity />
        <div className="fixed bottom-4 inset-x-4 z-50 flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
                className={`pointer-events-auto max-w-md w-fit rounded-2xl px-4 py-3 text-sm shadow-2xl border ${t.tone === "err" ? "bg-[#2a1215] border-[#E5484D]/40 text-[#ffb3b6]" : t.tone === "hot" ? "bg-[#2a1a10] border-hot/50 text-ivory" : "bg-ink-3 border-white/10 text-ivory"}`}>
                {t.href ? <Link href={t.href} className="underline-offset-4 hover:underline">{t.text}</Link> : t.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ToastCtx.Provider>
    </MotionConfig>
  );
}
