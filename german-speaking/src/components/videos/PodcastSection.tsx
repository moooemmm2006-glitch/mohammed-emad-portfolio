"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { podcastProgressKey, DKW_CHANNEL_URL, type PodcastItem } from "@/lib/podcastShared";
import { GeminiVideoLink } from "../gemini/GeminiCard";
import { YouTubePlaylist, YouTubePlayer } from "./YouTubePlayer";
import { Credit } from "./NicosWegSection";
import { useVideoProgress } from "./useVideos";

export function PodcastSection({ level }: { level: "B1" | "B2" }) {
  const { t } = useUI();
  const [episodes, setEpisodes] = useState<PodcastItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { items, loaded, save } = useVideoProgress();

  useEffect(() => {
    api<{ podcasts: PodcastItem[] }>(`/api/podcasts?level=${level}`).then((data) => setEpisodes(data.podcasts), () => setFailed(true));
  }, [level]);

  return (
    <section className="space-y-4" aria-label={`${t("pod_title")} ${level}`}>
      <header className="card p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-lg font-bold">{t("pod_header")}</h3>
          <p className="mt-1 text-sm leading-relaxed">{t("pod_intro")}</p>
        </div>
        <a className="btn btn-primary !min-h-[42px] w-fit" href={DKW_CHANNEL_URL} target="_blank" rel="noopener noreferrer">{t("pod_subscribe")} ↗</a>
      </header>
      {failed && <p role="alert" className="text-danger">{t("err_api")}</p>}
      {!episodes && !failed && <div className="h-28 animate-pulse rounded-2xl bg-surface-2/60" aria-hidden="true" />}
      {episodes?.map((episode) => {
        const key = podcastProgressKey(episode);
        const state = items[key];
        return (
          <article key={episode.id} className="card p-4 sm:p-5 space-y-3">
            <h4 className="font-bold leading-snug" dir="ltr" lang="de">{episode.title}</h4>
            {episode.youtubeId ? (
              <YouTubePlayer videoId={episode.youtubeId} title={episode.title} startAt={state && !state.watched ? state.position : 0} onProgress={(position, duration, ended) => void save(key, ended ? { position, duration, watched: true } : { position, duration })} />
            ) : episode.playlistId ? (
              <YouTubePlaylist listId={episode.playlistId} title={episode.title} />
            ) : null}
            <Credit text={episode.channel} href={episode.youtubeId ? `https://www.youtube.com/watch?v=${episode.youtubeId}` : `https://www.youtube.com/playlist?list=${episode.playlistId}`} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`btn ${state?.watched ? "btn-ghost" : "btn-primary"} !min-h-[40px]`} aria-pressed={!!state?.watched} onClick={() => void save(key, { watched: !state?.watched })}>{state?.watched ? t("media_watched") : t("media_mark_watched")}</button>
              <a className="btn btn-ghost !min-h-[40px]" href={episode.youtubeId ? `https://www.youtube.com/watch?v=${episode.youtubeId}` : `https://www.youtube.com/playlist?list=${episode.playlistId}`} target="_blank" rel="noopener noreferrer">{t("pod_original")} ↗</a>
            </div>
            <GeminiVideoLink level={level} title={episode.title} labelKey="pod_gemini" />
          </article>
        );
      })}
      {loaded && episodes && episodes.length > 0 && <a className="btn btn-ghost !min-h-[42px]" href={DKW_CHANNEL_URL} target="_blank" rel="noopener noreferrer">{t("pod_all")} ↗</a>}
      <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm">💡 {t("pod_tip")}</p>
    </section>
  );
}
