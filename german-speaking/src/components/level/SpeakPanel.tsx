"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconMic, IconRepeat } from "../Icons";
import { api, useProviders } from "@/lib/client/api";
import { fill, type TKey } from "@/lib/client/i18n";
import { unlockSpeech } from "@/lib/client/tts";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";
import { chatPath, topicPath } from "@/lib/paths";
import { ArabicText, TopicSkeleton, TopicTitle, useLevelTopics } from "./shared";
import { topicCount } from "@/lib/bookLevels";
import { TiltDiv } from "./Tilt";
import { GeminiCard } from "../gemini/GeminiCard";
import { aiChatEnabled } from "@/lib/features";

/** 🗣️ Themen & Sprechen: talk with Gemini (the in-site AI chat only when switched on), today's review and the book topics. */
export function SpeakPanel({ level }: { level: Level }) {
  const { t, lang } = useUI();
  const router = useRouter();
  const providers = useProviders();
  const { topics, due, error } = useLevelTopics(level);
  const [chatTopic, setChatTopic] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const cfg = LEVEL_CONFIG[level];

  const startFree = async () => {
    unlockSpeech(); // this tap is the user gesture browsers need before the partner may speak
    setStarting(true);
    try {
      const d = await api<{ session: { id: string } }>("/api/sessions", { method: "POST", body: JSON.stringify({ level, topic: chatTopic }) });
      router.push(chatPath(level, d.session.id, true));
    } catch {
      setStarting(false);
    }
  };
  const done = topics?.filter((x) => x.progress.done).length ?? 0;

  return (
    <div className="space-y-6">
      <GeminiCard level={level} />

      {aiChatEnabled() && (
        <section className="card depth p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">{t("book_free_title")}</h2>
            <p className="text-sm text-muted">
              {t("book_free_sub")} · {t("level_partner")}: <span className="de font-semibold text-ink">{level === "B2" ? "Dr. Tobias Wendt" : cfg.persona.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="chip min-h-[38px]" aria-pressed={chatTopic === null} onClick={() => setChatTopic(null)}>
              {t("conv_topic_free")}
            </button>
            {cfg.topics.map((tp) => (
              <button key={tp.id} className="chip min-h-[38px]" aria-pressed={chatTopic === tp.de} onClick={() => setChatTopic(tp.de)}>
                {t(`ctopic_${level}_${tp.id}` as TKey)}
              </button>
            ))}
          </div>
          {providers?.llm === "mock" && <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">{t("mock_banner")}</p>}
          <button className="btn btn-primary w-full sm:w-auto" style={{ background: "var(--accent)", color: "#fff" }} onClick={() => void startFree()} disabled={starting}>
            <IconMic /> {t("conv_start")}
          </button>
        </section>
      )}

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
                      <p className="mt-1 text-xs text-muted">
                        {tp.progress.done ? <b className="text-ok">{t("book_done")} · </b> : null}
                        {fill(t("book_progress"), { c: tp.progress.correct, t: tp.progress.total })}
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
