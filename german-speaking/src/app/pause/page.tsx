"use client";

import { useEffect, useState } from "react";
import { SubscribeButton } from "@/components/site/CreatorCard";
import { YouTubePlayer } from "@/components/videos/YouTubePlayer";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { CHANNEL_NAME, type Vlog } from "@/lib/siteShared";

/** ☕ استراحة: the owner's own vlogs, full videos (loaded on tap, never autoplay), newest first. */
export default function PausePage() {
  const { t } = useUI();
  const [vlogs, setVlogs] = useState<Vlog[] | null>(null);
  useEffect(() => {
    api<{ vlogs: Vlog[] }>("/api/vlogs").then((d) => setVlogs(d.vlogs), () => setVlogs([]));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold">{t("pause_title")}</h1>
        <p className="leading-relaxed text-muted">{t("pause_intro")}</p>
      </header>
      {!vlogs && <div className="card h-72 animate-pulse bg-surface-2/60" aria-hidden="true" />}
      {vlogs?.length === 0 && <p className="card p-5 text-muted">{t("pause_empty")}</p>}
      {vlogs?.map((v) => (
        <article key={v.youtubeId} className="card depth p-4 sm:p-5 space-y-3">
          <YouTubePlayer videoId={v.youtubeId} title={v.title} />
          <div>
            <h2 className="text-lg font-bold" dir="auto">
              {v.title}
            </h2>
            <p className="text-xs text-muted" dir="auto">
              {CHANNEL_NAME}
            </p>
          </div>
          {v.description_ar && (
            <p lang="ar" dir="rtl" className="leading-relaxed text-start">
              {v.description_ar}
            </p>
          )}
          <SubscribeButton place="pause" />
        </article>
      ))}
    </div>
  );
}
