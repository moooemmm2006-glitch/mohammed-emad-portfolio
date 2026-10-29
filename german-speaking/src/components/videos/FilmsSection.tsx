"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { filmProgressKey, justWatchSearchUrl, type FilmItem } from "@/lib/filmsShared";
import { GeminiVideoLink } from "../gemini/GeminiCard";
import { Credit } from "./NicosWegSection";
import { YouTubePlayer } from "./YouTubePlayer";
import { useVideoProgress } from "./useVideos";

export function FilmsSection() {
  const { t, lang } = useUI();
  const [films, setFilms] = useState<FilmItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { items, loaded, save } = useVideoProgress();

  useEffect(() => {
    api<{ films: FilmItem[] }>("/api/films").then((data) => setFilms(data.films), () => setFailed(true));
  }, []);

  const localized = (film: FilmItem) => film.copy?.[lang] ?? { genre: film.genre ?? "", summary: film.summary, usefulness: film.usefulness ?? "" };

  return (
    <section className="space-y-4" aria-label={t("film_title")}>
      {failed && <p role="alert" className="text-danger">{t("err_api")}</p>}
      {!films && !failed && <div className="h-36 animate-pulse rounded-2xl bg-surface-2/60" aria-hidden="true" />}
      {films?.map((film) => {
        const key = filmProgressKey(film.id);
        const state = items[key];
        const copy = localized(film);
        return (
          <article key={film.id} className="card p-4 sm:p-5 space-y-3">
            <header className="flex flex-wrap items-start gap-2">
              <h3 className="flex-1 font-bold text-lg leading-snug" dir="ltr" lang="de">{film.title}</h3>
              <span className="chip text-xs">{film.youtubeId ? t("film_level") : t("film_estimated_level")}</span>
            </header>
            <p className="text-sm text-muted">{copy.genre}{film.year ? ` · ${film.year}` : ""}</p>
            <p className="leading-relaxed">{copy.summary}</p>
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm"><b>{t("film_useful")}:</b> {copy.usefulness}</p>
            {film.youtubeId && <YouTubePlayer videoId={film.youtubeId} title={film.title} />}
            {film.channel && film.sourceUrl && <Credit text={film.channel} href={film.sourceUrl} />}
            <div className="flex flex-wrap gap-2">
              {film.youtubeId ? (
                film.channelUrl && <a className="btn btn-ghost !min-h-[40px]" href={film.channelUrl} target="_blank" rel="noopener noreferrer">{t("film_channel_more")} ↗</a>
              ) : (
                <a className="btn btn-primary !min-h-[40px]" href={justWatchSearchUrl(film.title)} target="_blank" rel="noopener noreferrer">{t("film_where_watch")} ↗</a>
              )}
              <button type="button" className={`btn ${state?.watched ? "btn-ghost" : "btn-primary"} !min-h-[40px]`} aria-pressed={!!state?.watched} onClick={() => void save(key, { watched: !state?.watched })}>{state?.watched ? t("media_watched") : t("media_mark_watched")}</button>
            </div>
            <GeminiVideoLink level="B2" title={film.title} film labelKey="film_gemini" />
          </article>
        );
      })}
      {loaded && films && <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">{t("film_estimated_note")}</p>}
      <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm">💡 {t("film_tip")}</p>
    </section>
  );
}

