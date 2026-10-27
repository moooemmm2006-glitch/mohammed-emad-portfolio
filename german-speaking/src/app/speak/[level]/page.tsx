"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { IconArrow, IconMic, IconRepeat } from "@/components/Icons";
import { api, useProviders } from "@/lib/client/api";
import { fill } from "@/lib/client/i18n";
import { unlockSpeech } from "@/lib/client/tts";
import { useUI } from "@/lib/client/ui";
import type { TopicSummary } from "@/lib/book";
import type { TopicProgress } from "@/lib/bookProgress";
import { isLevel, LEVEL_CONFIG, type Level } from "@/lib/levels";

type TopicCard = TopicSummary & { progress: TopicProgress };

export default function LevelPage() {
  const { t, lang } = useUI();
  const router = useRouter();
  const params = useParams<{ level: string }>();
  const level = params.level?.toUpperCase();
  const providers = useProviders();
  const [topics, setTopics] = useState<TopicCard[] | null>(null);
  const [due, setDue] = useState<number | null>(null);
  const [chatTopic, setChatTopic] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isLevel(level)) return;
    api<{ topics: TopicCard[] }>(`/api/book/level/${level}`).then((d) => setTopics(d.topics), () => setError(true));
    api<{ items: { level: string }[] }>("/api/book/review").then((d) => setDue(d.items.filter((x) => x.level === level).length), () => setDue(0));
  }, [level]);

  if (!isLevel(level)) {
    return (
      <p className="py-20 text-center">
        <Link href="/speak" className="btn btn-primary">
          {t("back")}
        </Link>
      </p>
    );
  }
  const cfg = LEVEL_CONFIG[level as Level];

  const startFree = async () => {
    unlockSpeech(); // this tap is the user gesture browsers need before the partner may speak
    setStarting(true);
    try {
      const d = await api<{ session: { id: string } }>("/api/sessions", { method: "POST", body: JSON.stringify({ level, topic: chatTopic }) });
      router.push(`/speak/${level}/chat?session=${d.session.id}&new=1`);
    } catch {
      setError(true);
      setStarting(false);
    }
  };

  const done = topics?.filter((x) => x.progress.done).length ?? 0;

  return (
    <div className={`level-${level.toLowerCase()} max-w-5xl mx-auto space-y-6`}>
      <Link href="/speak" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink md:hidden min-h-[40px] -my-2 pe-3">
        <IconArrow size={16} className="rotate-180 rtl:rotate-0" /> {t("back")}
      </Link>

      <div className="card overflow-hidden">
        <div className="bg-accent-soft p-5 sm:p-6 flex items-center gap-5">
          <Avatar level={level} size={96} scene />
          <div className="min-w-0">
            <span className="rounded-full px-2.5 py-0.5 text-sm font-bold text-white bg-accent de">{level}</span>
            <h1 className="text-2xl font-extrabold mt-1">{cfg.info.name[lang]}</h1>
            {cfg.info.note && <p className="text-sm text-muted">{cfg.info.note[lang]}</p>}
            <p className="text-muted text-sm">
              {t("level_partner")}: <span className="de font-semibold text-ink">{level === "B2" ? "Dr. Tobias Wendt" : cfg.persona.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* free conversation */}
      <section className="card p-5 space-y-3">
        <div>
          <h2 className="text-lg font-bold">{t("book_free_title")}</h2>
          <p className="text-sm text-muted">{t("book_free_sub")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="chip min-h-[38px]" aria-pressed={chatTopic === null} onClick={() => setChatTopic(null)}>
            {t("conv_topic_free")}
          </button>
          {cfg.topics.map((tp) => (
            <button key={tp.id} className="chip min-h-[38px]" aria-pressed={chatTopic === tp.de} onClick={() => setChatTopic(tp.de)}>
              {lang === "ar" ? tp.ar : tp.en}
            </button>
          ))}
        </div>
        {providers?.llm === "mock" && <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">{t("mock_banner")}</p>}
        <button className="btn btn-primary w-full sm:w-auto" style={{ background: "var(--accent)", color: "#fff" }} onClick={() => void startFree()} disabled={starting}>
          <IconMic /> {t("conv_start")}
        </button>
      </section>

      {/* today's review */}
      {due !== null && due > 0 && (
        <section className="card p-5 flex flex-wrap items-center gap-3 border-gold/50">
          <div className="flex-1 min-w-[12rem]">
            <h2 className="font-bold">{t("book_review_title")}</h2>
            <p className="text-sm text-muted">{fill(t("book_review_sub"), { n: due })}</p>
          </div>
          <Link href={`/speak/review?level=${level}`} className="btn btn-primary">
            <IconRepeat size={16} /> {t("book_review_start")}
          </Link>
        </section>
      )}

      {/* book topics */}
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
        {!topics && !error && <p className="text-muted">{t("loading")}</p>}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics?.map((tp) => {
            const pct = Math.round((100 * tp.progress.correct) / tp.progress.total);
            return (
              <li key={tp.number}>
                <Link
                  href={`/speak/${level}/topic/${tp.number}`}
                  className={`card h-full p-4 flex flex-col gap-2 hover:shadow-lg transition ${tp.progress.done ? "border-ok/60" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 grid place-items-center w-9 h-9 rounded-full text-sm font-bold tabular-nums ${tp.progress.done ? "bg-ok text-white" : "bg-accent-soft text-accent"}`}>
                      {tp.progress.done ? "✓" : tp.number}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold leading-snug">{tp.title_ar}</span>
                      <span dir="ltr" lang="de" className="block de text-sm text-muted font-semibold text-start">
                        {tp.title_de}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-muted line-clamp-2">{tp.intro_ar}</p>
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
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
