"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { egKey, EASY_GERMAN_CHANNEL_URL, type EasyGermanVideo } from "@/lib/easyGermanShared";
import type { Level } from "@/lib/levels";
import { GeminiVideoLink } from "../gemini/GeminiCard";
import { YouTubePlayer } from "./YouTubePlayer";
import { useVideoProgress } from "./useVideos";

interface TopicVideos { topic: number; title: string; titleAr: string; videos: EasyGermanVideo[] }

export function EasyGermanLevelSection({ level }: { level: "B1" | "B2" }) {
  const { t } = useUI();
  const [topics, setTopics] = useState<TopicVideos[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { items, save, loaded } = useVideoProgress();

  useEffect(() => {
    api<{ videos: TopicVideos[] }>(`/api/videos/level/${level}`).then((data) => setTopics(data.videos), () => setFailed(true));
  }, [level]);

  if (failed) return <p role="alert" className="text-danger">{t("err_api")}</p>;
  if (!topics) return <div className="h-40 animate-pulse rounded-2xl bg-surface-2/60" aria-hidden="true" />;
  const total = topics.reduce((n, topic) => n + topic.videos.length, 0);
  const watched = topics.reduce((n, topic) => n + topic.videos.filter((v) => items[egKey(v.youtubeId)]?.watched).length, 0);

  return (
    <section className="space-y-4" aria-label={`${t("eg_title")} ${level}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t("eg_intro")}</p>
        {loaded && total > 0 && <span className="chip text-xs">{watched}/{total}</span>}
      </header>
      {total === 0 && <p className="card p-4 text-sm text-muted">{t("eg_none")}</p>}
      {topics.map((topic) => (
        <section key={topic.topic} className="space-y-3">
          <h3 className="font-bold flex flex-wrap gap-x-2"><span>{topic.titleAr}</span><span className="text-muted font-normal" dir="ltr">· {topic.title}</span></h3>
          {topic.videos.map((video) => {
            const key = egKey(video.youtubeId);
            const state = items[key];
            return (
              <article key={video.youtubeId} className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                <h4 className="font-semibold leading-snug" dir="ltr" lang="en">{video.title}</h4>
                <YouTubePlayer videoId={video.youtubeId} title={video.title} startAt={state && !state.watched ? state.position : 0} onProgress={(position, duration, ended) => void save(key, ended ? { position, duration, watched: true } : { position, duration })} />
                <p className="text-xs text-muted">© <a href={video.url} target="_blank" rel="noopener noreferrer" className="underline">{video.channel}</a></p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={`btn ${state?.watched ? "btn-ghost" : "btn-primary"} !min-h-[40px]`} aria-pressed={!!state?.watched} onClick={() => void save(key, { watched: !state?.watched })}>{state?.watched ? t("media_watched") : t("media_mark_watched")}</button>
                  <a className="btn btn-ghost !min-h-[40px]" href={video.url} target="_blank" rel="noopener noreferrer">{t("vid_open_youtube")} ↗</a>
                  <a className="btn btn-ghost !min-h-[40px]" href={EASY_GERMAN_CHANNEL_URL} target="_blank" rel="noopener noreferrer">{t("eg_subscribe")} ↗</a>
                </div>
                <GeminiVideoLink level={level as Level} title={video.title} />
              </article>
            );
          })}
        </section>
      ))}
      <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm">💡 {t("eg_tip")}</p>
    </section>
  );
}
