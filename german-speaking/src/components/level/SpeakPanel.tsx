"use client";

import Link from "next/link";
import { IconRepeat } from "../Icons";
import { fill } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { Level } from "@/lib/levels";
import { topicPath } from "@/lib/paths";
import { ArabicText, TopicSkeleton, TopicTitle, useLevelTopics } from "./shared";
import { topicCount } from "@/lib/bookLevels";
import { TiltDiv } from "./Tilt";
import { GeminiCard } from "../gemini/GeminiCard";

/** 🗣️ Themen & Sprechen: talk with Gemini at the level, today's review and the book topics. */
export function SpeakPanel({ level }: { level: Level }) {
  const { t, lang } = useUI();
  const { topics, due, error } = useLevelTopics(level);
  const done = topics?.filter((x) => x.progress.done).length ?? 0;

  return (
    <div className="space-y-6">
      <GeminiCard level={level} />

      {due > 0 && (
        <section className="card depth p-5 flex flex-wrap items-center gap-3 border-gold/50">
          <div className="flex-1 min-w-[12rem]">
            <h2 className="font-bold">{t("book_review_title")}</h2>
            <p className="text-sm text-muted">{fill(t("book_review_sub"), { n: due })}</p>
          </div>
          <Link href={`/review?level=${level}`} className="btn btn-primary">
            <IconRepeat size={16} /> {t("book_review_start")}
          </Link>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">{t("book_topics_title")}</h2>
            <p className="text-sm text-muted">{t("book_topics_sub")}</p>
          </div>
          {topics && (
            <span className="chip text-sm">
              ✓ {done} / {topics.length}
            </span>
          )}
        </div>
        {error && <p className="text-danger">{t("err_api")}</p>}
        {!topics && !error && <TopicSkeleton count={topicCount(level)} />}
        <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics?.map((tp, i) => {
            const pct = Math.round((100 * tp.progress.correct) / tp.progress.total);
            return (
              <li key={tp.number} className="rise-3d [content-visibility:auto] [contain-intrinsic-size:auto_178px]" style={{ ["--i" as string]: Math.min(i, 14) }}>
                <TiltDiv className={`card depth h-full ${tp.progress.done ? "border-ok/60" : ""}`}>
                  <Link href={topicPath(level, tp.number)} className="h-full p-4 flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 grid place-items-center w-9 h-9 rounded-full text-sm font-bold tabular-nums ${tp.progress.done ? "bg-ok text-white" : "bg-accent-soft text-accent"}`}>
                        {tp.progress.done ? "✓" : tp.number}
                      </span>
                      <span className="min-w-0">
                        <TopicTitle tp={tp} />
                      </span>
                    </div>
                    {lang === "ar" ? <p className="text-sm text-muted line-clamp-2">{tp.intro_ar}</p> : <ArabicText block className="text-sm text-muted line-clamp-2">{tp.intro_ar}</ArabicText>}
                    <div className="mt-auto pt-1">
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted flex flex-wrap items-center gap-x-2">
                        <span>
                          {tp.progress.done ? <b className="text-ok">{t("book_done")} · </b> : null}
                          {fill(t("book_progress"), { c: tp.progress.correct, t: tp.progress.total })}
                        </span>
                        {tp.videos && tp.videos.total > 0 && (
                          <span className={`ms-auto tabular-nums ${tp.videos.watched === tp.videos.total ? "text-ok font-semibold" : ""}`} title="Easy German">
                            🎧 {tp.videos.watched}/{tp.videos.total}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                </TiltDiv>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
