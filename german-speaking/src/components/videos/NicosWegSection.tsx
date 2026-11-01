"use client";

import { DW_COURSE_URL, NICOS_STUDY_GUIDE_ID, NICOS_WEG_CREDIT, nicosWeg, youtubePlaylistUrl, youtubeWatchUrl } from "../../../data/videos";
import { fill } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { percentOf } from "@/lib/videoShared";
import { formatTime, YouTubePlayer, YouTubePlaylist } from "./YouTubePlayer";
import { useVideoProgress } from "./useVideos";
import { GeminiVideoLink } from "../gemini/GeminiCard";

/** DW "Nicos Weg" for A1, A2 and B1: the level's full movie, the episodes playlist (when verified), progress. */
export function NicosWegSection({ level, hideIntro = false }: { level: "A1" | "A2" | "B1"; hideIntro?: boolean }) {
  const { t } = useUI();
  const cfg = nicosWeg[level];
  const { items, loaded, save } = useVideoProgress();
  const movieKey = `nicos:${level}:movie`;
  const movie = items[movieKey];
  const pct = percentOf(movie);
  const title = `Nicos Weg ${level} – Film`;

  return (
    <section className="space-y-4" aria-label={`Nicos Weg ${level}`}>
      {!hideIntro && (
        <div className="card p-5 space-y-2">
          <h2 className="text-xl font-bold">🎬 {t("vid_nicos_title")}</h2>
          <p className="leading-relaxed">{t("vid_nicos_intro")}</p>
        </div>
      )}

      <div className="card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">
            {t("vid_full_movie")} <span className="de text-muted" dir="ltr">· {level}</span>
          </h3>
          {loaded && (
            <span className={`chip text-sm ${movie?.watched ? "text-ok" : ""}`}>
              {movie?.watched ? `✓ ${t("vid_done")}` : `${pct}%`}
            </span>
          )}
        </div>
        {loaded ? (
          <YouTubePlayer
            videoId={cfg.movieId}
            title={title}
            startAt={movie && !movie.watched ? movie.position : 0}
            onProgress={(position, duration, ended) => void save(movieKey, ended ? { position, duration, watched: true } : { position, duration })}
          />
        ) : (
          <div className="w-full aspect-video rounded-2xl bg-surface-2" />
        )}
        {movie && !movie.watched && movie.position > 30 && <p className="text-sm text-muted">{fill(t("vid_resume_note"), { t: formatTime(movie.position) })}</p>}
        <Credit text={NICOS_WEG_CREDIT} href={youtubeWatchUrl(cfg.movieId)} />
        <GeminiVideoLink level={level} title={title} />
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn ${movie?.watched ? "btn-ghost" : "btn-primary"} !min-h-[42px]`}
            onClick={() => void save(movieKey, { watched: !movie?.watched })}
            aria-pressed={!!movie?.watched}
          >
            {movie?.watched ? `✓ ${t("vid_done")}` : t("vid_mark_movie")}
          </button>
          <a className="btn btn-ghost !min-h-[42px]" href={youtubeWatchUrl(cfg.movieId)} target="_blank" rel="noopener noreferrer">
            ▶ {t("vid_open_youtube")}
          </a>
          <a className="btn btn-ghost !min-h-[42px]" href={DW_COURSE_URL} target="_blank" rel="noopener noreferrer">
            {t("vid_dw_exercises")} ↗
          </a>
        </div>
        <Tip />
      </div>

      <StudyGuide />

      {cfg.playlistStartIndex && (
        <div className="card p-4 sm:p-5 space-y-3">
          <h3 className="font-bold">{t("vid_episodes")}</h3>
          <YouTubePlaylist listId={cfg.playlistId} index={cfg.playlistStartIndex} title={`Nicos Weg ${level} – ${t("vid_episodes")}`} poster={cfg.movieId} />
          <Credit text={NICOS_WEG_CREDIT} href={youtubePlaylistUrl(cfg.playlistId, cfg.playlistStartIndex)} />
          <GeminiVideoLink level={level} title={`Nicos Weg ${level}`} />
        </div>
      )}

    </section>
  );
}

/** ⌄ "How to study the video": a closed card under Nicos Weg; tapping the arrow opens the owner's guide video. */
function StudyGuide() {
  const { t } = useUI();
  return (
    <details className="study-guide card group overflow-hidden" data-testid="nicos-study-guide">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5 min-h-[56px] [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px]">
        <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-red-600/10 text-red-600 text-lg" aria-hidden="true">
          ▶
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{t("vid_guide_title")}</span>
          <span className="block text-sm text-muted">{t("vid_guide_sub")}</span>
        </span>
        <span className="grid place-items-center w-9 h-9 shrink-0 rounded-full bg-surface-2 text-lg transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2">
        <YouTubePlayer videoId={NICOS_STUDY_GUIDE_ID} title={t("vid_guide_title")} />
        <a className="text-xs text-muted underline" href={youtubeWatchUrl(NICOS_STUDY_GUIDE_ID)} target="_blank" rel="noopener noreferrer">
          ▶ {t("vid_open_youtube")}
        </a>
      </div>
    </details>
  );
}

export function Credit({ text, href }: { text: string; href: string }) {
  const { t } = useUI();
  return (
    <p className="text-xs text-muted">
      © <span className="de" dir="ltr">{text}</span> ·{" "}
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
        {t("vid_original")}
      </a>
    </p>
  );
}

export function Tip() {
  const { t } = useUI();
  return <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm">💡 {t("vid_tip")}</p>;
}
