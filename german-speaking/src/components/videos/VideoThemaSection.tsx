"use client";

import { useEffect, useRef, useState } from "react";
import { DW_COURSE_URL, nicosWeg, VIDEO_THEMA_CREDIT } from "../../../data/videos";
import { api } from "@/lib/client/api";
import { fill, localeOf } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { Episode, FeedResult } from "@/lib/videoThema";
import { formatTime } from "./YouTubePlayer";
import { Credit, Tip } from "./NicosWegSection";
import { useVideoProgress } from "./useVideos";
import { GeminiVideoLink } from "../gemini/GeminiCard";

/** DW "Video-Thema" for B2: the latest episodes from DW's official feed (fetched by our server). */
export function VideoThemaSection({ hideIntro = false }: { hideIntro?: boolean }) {
  const { t, lang } = useUI();
  const [feed, setFeed] = useState<FeedResult | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const { items, save } = useVideoProgress();
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<FeedResult>("/api/videos/b2").then(setFeed, () => setFeed({ episodes: [], status: "error", fetchedAt: null }));
  }, []);

  const open = feed?.episodes.find((e) => e.id === openId) ?? null;
  const watchedCount = feed?.episodes.filter((e) => items[`vt:${e.id}`]?.watched).length ?? 0;
  const date = (d: string | null) => (d ? new Date(d).toLocaleDateString(localeOf(lang), { dateStyle: "medium" }) : "");

  return (
    <section className="space-y-4" aria-label="Video-Thema B2">
      {!hideIntro && (
        <div className="card p-5 space-y-2">
          <h2 className="text-xl font-bold">🎬 {t("vid_vt_title")}</h2>
          <p className="leading-relaxed">{t("vid_vt_intro")}</p>
          {feed && feed.episodes.length > 0 && <p className="text-sm text-muted">{fill(t("vid_vt_watched"), { n: watchedCount, t: feed.episodes.length })}</p>}
        </div>
      )}

      {open && (
        <div ref={playerRef} className="card p-4 sm:p-5 space-y-3 scroll-mt-20">
          <h3 className="font-bold text-lg" dir="ltr" lang="de">
            {open.title}
          </h3>
          <EpisodePlayer
            ep={open}
            startAt={items[`vt:${open.id}`]?.watched ? 0 : (items[`vt:${open.id}`]?.position ?? 0)}
            onProgress={(position, duration, ended) => void save(`vt:${open.id}`, ended ? { position, duration, watched: true } : { position, duration })}
          />
          <Credit text={VIDEO_THEMA_CREDIT} href={open.link ?? nicosWeg.B2.podcastPage} />
          <GeminiVideoLink level="B2" title={open.title} />
          <div className="flex flex-wrap gap-2">
            <button
              className={`btn ${items[`vt:${open.id}`]?.watched ? "btn-ghost" : "btn-primary"} !min-h-[42px]`}
              onClick={() => void save(`vt:${open.id}`, { watched: !items[`vt:${open.id}`]?.watched })}
            >
              {items[`vt:${open.id}`]?.watched ? `✓ ${t("vid_done")}` : t("vid_mark_episode")}
            </button>
            {open.link && (
              <a className="btn btn-ghost !min-h-[42px]" href={open.link} target="_blank" rel="noopener noreferrer">
                {t("vid_source_dw")} ↗
              </a>
            )}
          </div>
          {open.summary && (
            <p className="text-sm leading-relaxed" dir="ltr" lang="de">
              {open.summary}
            </p>
          )}
          {open.text && (
            <details className="rounded-xl bg-surface-2 px-4 py-3">
              <summary className="cursor-pointer font-semibold">{t("vid_text")}</summary>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-start" dir="ltr" lang="de">
                {open.text}
              </p>
            </details>
          )}
          <Tip />
        </div>
      )}

      {!feed && <p className="text-muted">{t("loading")}</p>}
      {feed && feed.episodes.length === 0 && (
        <div className="card p-5 space-y-3">
          <p>{t("vid_vt_error")}</p>
          <a className="btn btn-primary" href={DW_COURSE_URL} target="_blank" rel="noopener noreferrer">
            learngerman.dw.com ↗
          </a>
        </div>
      )}
      {feed?.status === "stale" && <p className="text-xs text-muted">{t("vid_vt_stale")}</p>}

      <ul className="grid gap-3 sm:grid-cols-2">
        {feed?.episodes.map((e) => {
          const st = items[`vt:${e.id}`];
          return (
            <li key={e.id}>
              <button
                className={`card w-full h-full text-start p-4 flex flex-col gap-1.5 hover:shadow-lg transition ${openId === e.id ? "border-accent" : ""} ${st?.watched ? "border-ok/60" : ""}`}
                onClick={() => {
                  setOpenId(e.id);
                  requestAnimationFrame(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }}
              >
                <span className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span>{date(e.date)}</span>
                  {st?.watched ? <b className="text-ok">✓ {t("vid_done")}</b> : st && st.position > 30 ? <span>⏵ {formatTime(st.position)}</span> : null}
                </span>
                <span className="font-bold leading-snug" dir="ltr" lang="de">
                  {e.title}
                </span>
                {e.summary && (
                  <span className="text-sm text-muted line-clamp-3" dir="ltr" lang="de">
                    {e.summary}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Plays DW's own video file from the feed (like a podcast app); position saved while watching. */
function EpisodePlayer({ ep, startAt, onProgress }: { ep: Episode; startAt: number; onProgress: (p: number, d: number, ended: boolean) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const report = useRef(onProgress);
  report.current = onProgress;
  const last = useRef(0);
  return (
    <video
      ref={ref}
      key={ep.id}
      className="w-full aspect-video rounded-2xl bg-black"
      controls
      playsInline
      preload="none"
      poster={ep.image ?? undefined}
      onLoadedMetadata={(e) => {
        if (startAt > 5 && startAt < e.currentTarget.duration - 5) e.currentTarget.currentTime = startAt;
      }}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (Math.abs(v.currentTime - last.current) >= 15) {
          last.current = v.currentTime;
          report.current(v.currentTime, v.duration || 0, false);
        }
      }}
      onPause={(e) => report.current(e.currentTarget.currentTime, e.currentTarget.duration || 0, false)}
      onEnded={(e) => report.current(e.currentTarget.duration, e.currentTarget.duration, true)}
    >
      <source src={ep.videoUrl} type={ep.videoType} />
    </video>
  );
}
