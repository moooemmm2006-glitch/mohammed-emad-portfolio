"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { fill } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { BookTopic } from "@/lib/book";
import { EASY_GERMAN_CHANNEL_URL, easyGermanSearchUrl, egKey, type EasyGermanVideo } from "@/lib/easyGermanShared";
import type { Level } from "@/lib/levels";
import { GeminiVideoLink } from "../gemini/GeminiCard";
import { IconHeadphones } from "../Icons";
import { invalidateLevelTopics } from "../level/shared";
import { YouTubePlayer } from "./YouTubePlayer";
import { useVideoProgress } from "./useVideos";

/** 🎧 Hören on a book topic: real Easy German videos (official YouTube player only), watched progress, credit, Gemini link. */
export function EasyGermanTab({ level, topic }: { level: Level; topic: BookTopic }) {
  const { t } = useUI();
  const [videos, setVideos] = useState<EasyGermanVideo[] | null>(null);
  const [error, setError] = useState(false);
  const { items, save } = useVideoProgress();

  useEffect(() => {
    api<{ videos: EasyGermanVideo[] }>(`/api/videos/topic/${topic.number}`).then(
      (d) => setVideos(d.videos),
      () => setError(true),
    );
  }, [topic.number]);

  const markWatched = async (id: string, watched: boolean, extra: { position?: number; duration?: number } = {}) => {
    await save(egKey(id), { watched, ...extra });
    invalidateLevelTopics(level); // the "🎧 X/Y" on the topic card
  };

  if (error) return <p className="text-danger">{t("err_api")}</p>;
  if (!videos) return <div className="card p-5 h-64 animate-pulse bg-surface-2/60" aria-hidden="true" />;
  const watchedCount = videos.filter((v) => items[egKey(v.youtubeId)]?.watched).length;

  return (
    <section className="space-y-4" aria-label={t("tab_hoeren")}>
      <div className="card p-5 space-y-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <IconHeadphones size={22} /> {t("eg_title")}
          {videos.length > 0 && <span className="chip text-sm ms-auto">🎧 {fill(t("eg_watched_of"), { n: watchedCount, t: videos.length })}</span>}
        </h2>
        <p className="leading-relaxed">{t("eg_intro")}</p>
      </div>

      {videos.length === 0 && (
        <div className="card p-5 space-y-3">
          <p className="font-semibold">{t("eg_none")}</p>
          <a className="btn btn-primary" href={easyGermanSearchUrl(topic.title_de)} target="_blank" rel="noopener noreferrer">
            {t("eg_search")} ↗
          </a>
        </div>
      )}

      {videos.map((v) => {
        const st = items[egKey(v.youtubeId)];
        return (
          <article key={v.youtubeId} className="card p-4 sm:p-5 space-y-3">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold leading-snug text-start" dir="ltr" lang="en">
                  {v.title}
                </h3>
                <p className="text-sm text-muted" dir="ltr">
                  {v.channel}
                </p>
              </div>
              {st?.watched && <span className="chip text-sm text-ok shrink-0">{t("eg_watched")}</span>}
            </header>
            <YouTubePlayer
              videoId={v.youtubeId}
              title={v.title}
              startAt={st && !st.watched ? st.position : 0}
              onProgress={(position, duration, ended) =>
                void (ended ? markWatched(v.youtubeId, true, { position, duration }) : save(egKey(v.youtubeId), { position, duration }))
              }
            />
            <p className="text-xs text-muted">
              ©{" "}
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="underline">
                {t("eg_credit")}
              </a>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn ${st?.watched ? "btn-ghost" : "btn-primary"} !min-h-[42px]`}
                aria-pressed={!!st?.watched}
                onClick={() => void markWatched(v.youtubeId, !st?.watched)}
              >
                {st?.watched ? t("eg_watched") : t("eg_mark")}
              </button>
              <a className="btn btn-ghost !min-h-[42px]" href={v.url} target="_blank" rel="noopener noreferrer">
                ▶ {t("vid_open_youtube")} ↗
              </a>
              <a className="btn btn-ghost !min-h-[42px]" href={EASY_GERMAN_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
                {t("eg_subscribe")} ↗
              </a>
            </div>
            <GeminiVideoLink level={level} title={v.title} />
          </article>
        );
      })}

      {videos.length > 0 && <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm">💡 {t("eg_tip")}</p>}

    </section>
  );
}
