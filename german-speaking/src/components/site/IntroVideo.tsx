"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@/components/Icons";
import { useUI } from "@/lib/client/ui";

// 🎬 "اتعرّف على الموقع": the intro video (the owner's own, guests agreed). The page shows only the
// poster; the video file is requested only after the play button is pressed, and plays in a dialog.

const VIDEO = "/media/german-intro-web.mp4";
const POSTER = "/media/german-intro-poster.jpg";

export function IntroVideo() {
  const { t } = useUI();
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-3" aria-labelledby="intro-video-title" data-testid="intro-video">
      <div>
        <h2 id="intro-video-title" className="text-xl sm:text-2xl font-extrabold">
          {t("intro_title")}
        </h2>
        <p className="text-sm sm:text-base text-muted mt-1">{t("intro_sub")}</p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("intro_play_aria")}
        className="group relative block w-full max-w-3xl mx-auto overflow-hidden rounded-[1.25rem] border border-line bg-surface-2 shadow-[var(--shadow)] aspect-video focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a plain lazy poster; no optimisation needed */}
        <img src={POSTER} alt="" width={1280} height={720} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" aria-hidden="true" />
        <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <span className="grid place-items-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 text-[var(--brand)] shadow-xl transition-transform motion-safe:group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-9 sm:h-9 translate-x-0.5" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5z" />
            </svg>
          </span>
        </span>
        <span className="absolute bottom-3 start-3 rounded-full bg-black/60 px-3 py-1 text-xs sm:text-sm font-semibold text-white" aria-hidden="true">
          ▶ {t("intro_label")}
        </span>
      </button>
      <p className="text-xs text-muted text-center">{t("intro_consent")}</p>
      {open && <VideoDialog onClose={() => setOpen(false)} />}
    </section>
  );
}

function VideoDialog({ onClose }: { onClose: () => void }) {
  const { t } = useUI();
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const body = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.querySelector<HTMLElement>("[data-close-btn]")?.focus();
    // Started by the user's click, so playing with sound is allowed.
    void video.current?.play().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
      }
      if (e.key === "Tab" && box.current) {
        const items = [...box.current.querySelectorAll<HTMLElement>("button, video")];
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    const v = video.current;
    return () => {
      document.removeEventListener("keydown", onKey, true);
      // Stop and rewind, then give the page back.
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
      document.body.style.overflow = body;
      before?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={t("intro_title")} data-testid="intro-dialog">
      <button type="button" className="absolute inset-0 bg-black/80" aria-label={t("close")} tabIndex={-1} onClick={onClose} data-testid="intro-backdrop" />
      <div ref={box} className="relative w-full sm:max-w-5xl">
        <div className="flex justify-end px-2 pb-2">
          <button type="button" data-close-btn onClick={onClose} aria-label={t("close")} className="grid place-items-center w-11 h-11 rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70">
            <IconX />
          </button>
        </div>
        <video ref={video} src={VIDEO} poster={POSTER} controls playsInline preload="none" className="block w-full aspect-video bg-black sm:rounded-2xl" />
      </div>
    </div>,
    document.body,
  );
}
