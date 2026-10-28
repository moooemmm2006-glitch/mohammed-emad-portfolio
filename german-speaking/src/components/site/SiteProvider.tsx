"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PUBLIC_PATHS, useMe } from "@/lib/client/me";
import { useUI } from "@/lib/client/ui";
import { localDay, shouldOfferPause, type ClickPlace, type SiteLinks } from "@/lib/siteShared";
import { IconVideoPlay, IconX } from "../Icons";
import { YouTubePlayer } from "../videos/YouTubePlayer";

// The owner's channel, the explainer video ("إزاي تستخدم الموقع؟") and the once-a-day "take a break"
// toast. The links come from the server with the page, so nothing pops in or shows empty.

const EXPLAINER_COOKIE = "gs_explainer_seen";

interface SiteCtx {
  links: SiteLinks;
  openExplainer: () => void;
  trackClick: (place: ClickPlace) => void;
  /** After finishing something (never during an exercise): maybe offer "☕ استراحة", max once a day. */
  offerPause: () => void;
}

const Ctx = createContext<SiteCtx | null>(null);

export function useSite(): SiteCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSite outside SiteProvider");
  return c;
}

const hasCookie = (name: string) => typeof document !== "undefined" && document.cookie.split("; ").some((c) => c === `${name}=1`);

export function SiteProvider({ links, children }: { links: SiteLinks; children: ReactNode }) {
  const path = usePathname();
  const { me, loading, setPrefs } = useMe();
  const [explainer, setExplainer] = useState(false);
  const [toast, setToast] = useState(false);
  const autoTried = useRef(false);

  const trackClick = useCallback((place: ClickPlace) => {
    void fetch("/api/channel/click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ place }), keepalive: true }).catch(() => {});
  }, []);

  const markSeen = useCallback(() => {
    document.cookie = `${EXPLAINER_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    if (me && !me.prefs?.explainerSeen) setPrefs({ explainerSeen: true });
  }, [me, setPrefs]);

  // First visit: open the explainer once by itself (only when the video exists).
  // Logged in → remembered with the account; logged out → in a cookie.
  useEffect(() => {
    // Not on the admin page (the owner is editing the links there).
    if (!links.explainerId || loading || autoTried.current || path.startsWith("/admin")) return;
    const loggedOut = PUBLIC_PATHS.includes(path) || !me;
    if (!loggedOut && !me.prefs) return;
    autoTried.current = true;
    const seen = loggedOut ? hasCookie(EXPLAINER_COOKIE) : me.prefs?.explainerSeen;
    if (!seen) setExplainer(true);
  }, [links.explainerId, loading, me, path]);

  const offerPause = useCallback(() => {
    if (!me) return;
    const today = localDay();
    if (!shouldOfferPause(me.prefs?.pauseOfferDay, today)) return;
    setPrefs({ pauseOfferDay: today });
    setToast(true);
  }, [me, setPrefs]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(false), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const openExplainer = useCallback(() => links.explainerId && setExplainer(true), [links.explainerId]);

  return (
    <Ctx.Provider value={{ links, openExplainer, trackClick, offerPause }}>
      {children}
      {explainer && links.explainerId && (
        <ExplainerModal
          videoId={links.explainerId}
          channelUrl={links.channelUrl}
          onSubscribe={() => trackClick("explainer")}
          onClose={() => {
            markSeen();
            setExplainer(false);
          }}
        />
      )}
      {toast && <PauseToast onClose={() => setToast(false)} />}
    </Ctx.Provider>
  );
}

/** "إزاي تستخدم الموقع؟": the explainer video in a glassy centred dialog. Never plays by itself. */
function ExplainerModal({ videoId, channelUrl, onSubscribe, onClose }: { videoId: string; channelUrl: string | null; onSubscribe: () => void; onClose: () => void }) {
  const { t } = useUI();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("button")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      before?.focus?.();
    };
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={t("yt_explainer_title")}>
      <button type="button" className="absolute inset-0 bg-black/55 sheet-fade" aria-label={t("close")} tabIndex={-1} onClick={onClose} />
      <div ref={box} className="explainer-card relative w-full max-w-3xl rounded-3xl p-4 sm:p-6 space-y-4 rise-3d">
        <div className="flex items-center gap-3">
          <IconVideoPlay size={28} />
          <h2 className="text-xl sm:text-2xl font-extrabold flex-1">{t("yt_explainer_title")}</h2>
          <button type="button" className="btn btn-ghost !px-2 !min-h-[38px]" onClick={onClose} aria-label={t("close")}>
            <IconX />
          </button>
        </div>
        <YouTubePlayer videoId={videoId} title={t("yt_explainer_title")} />
        <div className="flex flex-wrap items-center gap-2">
          {channelUrl && (
            <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="btn btn-yt" onClick={onSubscribe}>
              <IconVideoPlay size={20} /> {t("yt_subscribe_mine")}
            </a>
          )}
          <button type="button" className="btn btn-ghost ms-auto" onClick={onClose}>
            {t("yt_not_now")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** "برافو! 👏 عايز تاخد استراحة؟ ☕" — small, bottom, 5 seconds, closable. */
function PauseToast({ onClose }: { onClose: () => void }) {
  const { t } = useUI();
  return createPortal(
    <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 pointer-events-none">
      <div className="sheet-fade pointer-events-auto flex items-center gap-3 rounded-full bg-ink text-bg ps-4 pe-1.5 py-1.5 shadow-xl text-sm font-semibold">
        <span>{t("pause_toast")}</span>
        <Link href="/pause" className="rounded-full bg-bg/15 px-3 py-1.5 hover:bg-bg/25" onClick={onClose}>
          ☕ {t("pause_name")}
        </Link>
        <button type="button" className="grid place-items-center w-8 h-8 rounded-full hover:bg-bg/15" onClick={onClose} aria-label={t("close")}>
          <IconX size={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
