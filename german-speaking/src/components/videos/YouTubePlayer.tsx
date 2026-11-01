"use client";

import { useEffect, useRef, useState } from "react";
import { posterFor, youtubeEmbedUrl, youtubePlaylistEmbedUrl, youtubeThumb } from "../../../data/videos";
import { useUI } from "@/lib/client/ui";
import { IconPlay } from "../Icons";

// The official YouTube player (youtube-nocookie), loaded only after a tap so pages stay light on phones.

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    o: { host: string; videoId: string; width?: string; height?: string; playerVars: Record<string, number | string>; events: { onStateChange?: (e: { data: number }) => void; onReady?: () => void } },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
/** The IFrame API (for the current position). Rejects after a timeout, then the plain embed is used. */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => reject(new Error("YouTube API blocked"));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error("YouTube API timeout")), 8000);
  }).catch((e) => {
    apiPromise = null;
    throw e;
  });
  return apiPromise;
}

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

export function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** One video. `onProgress` gets the position every ~15 s while playing, on pause and at the end. */
export function YouTubePlayer({
  videoId,
  title,
  startAt = 0,
  onProgress,
}: {
  videoId: string;
  title: string;
  startAt?: number;
  onProgress?: (position: number, duration: number, ended: boolean) => void;
}) {
  const { t } = useUI();
  const [open, setOpen] = useState(false);
  const [plain, setPlain] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const report = useRef(onProgress);
  report.current = onProgress;

  useEffect(() => {
    if (!open || plain || !box.current) return;
    let player: YTPlayer | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let alive = true;
    const send = (ended = false) => {
      if (!player) return;
      try {
        const d = player.getDuration();
        report.current?.(ended ? d : player.getCurrentTime(), d, ended);
      } catch {
        /* player not ready */
      }
    };
    const el = document.createElement("div");
    box.current.appendChild(el);
    loadYouTubeApi().then(
      (YT) => {
        if (!alive) return;
        player = new YT.Player(el, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, rel: 0, playsinline: 1, start: Math.floor(startAt), origin: location.origin },
          events: {
            onStateChange: (e) => {
              if (e.data === PLAYING && !timer) timer = setInterval(() => send(), 15000);
              if (e.data !== PLAYING && timer) {
                clearInterval(timer);
                timer = null;
              }
              if (e.data === PAUSED) send();
              if (e.data === ENDED) send(true);
            },
          },
        });
      },
      () => alive && setPlain(true),
    );
    return () => {
      alive = false;
      send();
      if (timer) clearInterval(timer);
      player?.destroy();
      el.remove();
    };
    // startAt only matters when the player is created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plain, videoId]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
      {!open ? (
        <button type="button" className="group absolute inset-0 w-full h-full" onClick={() => setOpen(true)} aria-label={`${t("vid_play")}: ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the video's thumbnail (ours when we have a sharp one) */}
          <img src={posterFor(videoId)} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:opacity-100 transition" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid place-items-center w-16 h-16 rounded-full bg-[#ff0033] text-white shadow-xl group-hover:scale-105 transition">
              <IconPlay size={28} />
            </span>
          </span>
          {startAt > 30 && (
            <span className="absolute bottom-3 start-3 rounded-full bg-black/75 text-white text-xs px-3 py-1">
              {t("vid_resume")} {formatTime(startAt)}
            </span>
          )}
        </button>
      ) : plain ? (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`${youtubeEmbedUrl(videoId, startAt)}&autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <div ref={box} className="absolute inset-0 [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full" />
      )}
    </div>
  );
}

/** A playlist from a given episode (plain embed). */
export function YouTubePlaylist({ listId, index = 1, title, poster }: { listId: string; index?: number; title: string; poster?: string | null }) {
  const { t } = useUI();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
      {!open ? (
        <button type="button" className="group absolute inset-0 w-full h-full" onClick={() => setOpen(true)} aria-label={`${t("vid_play")}: ${title}`}>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail
            <img src={youtubeThumb(poster)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition" />
          ) : (
            <span className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-950" />
          )}
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid place-items-center w-16 h-16 rounded-full bg-[#ff0033] text-white shadow-xl">
              <IconPlay size={28} />
            </span>
          </span>
        </button>
      ) : (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`${youtubePlaylistEmbedUrl(listId, index)}&autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
    </div>
  );
}
