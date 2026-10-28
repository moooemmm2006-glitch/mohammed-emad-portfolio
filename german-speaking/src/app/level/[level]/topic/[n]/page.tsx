"use client";

import { chatPath, levelPath, topicPath } from "@/lib/paths";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GrammarTab } from "@/components/book/GrammarTab";
import { Shadowing } from "@/components/book/Shadowing";
import { IconArrow, IconBook, IconMic, IconRepeat } from "@/components/Icons";
import { api, useProviders, useSettings } from "@/lib/client/api";
import type { TKey } from "@/lib/client/i18n";
import { unlockSpeech } from "@/lib/client/tts";
import { useUI } from "@/lib/client/ui";
import type { BookTopic } from "@/lib/book";
import { isLevel } from "@/lib/levels";

const TABS = [
  { id: "shadow", key: "tab_shadow", icon: IconRepeat },
  { id: "talk", key: "tab_talk", icon: IconMic },
  { id: "grammar", key: "tab_grammar", icon: IconBook },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function TopicPageWrapper() {
  return (
    <Suspense>
      <TopicPage />
    </Suspense>
  );
}

function TopicPage() {
  const { t } = useUI();
  const router = useRouter();
  const params = useParams<{ level: string; n: string }>();
  const search = useSearchParams();
  const level = params.level?.toUpperCase();
  const number = Number(params.n);
  const tab = (TABS.find((x) => x.id === search.get("tab"))?.id ?? "shadow") as Tab;
  const { settings } = useSettings();
  const providers = useProviders();
  const [data, setData] = useState<{ topic: BookTopic; scores: Record<number, number> } | null>(null);
  const [error, setError] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(number)) return setError(true);
    api<{ topic: BookTopic; scores: Record<number, number> }>(`/api/book/topic/${number}`).then(
      (d) => (d.topic.level === level ? setData(d) : setError(true)),
      () => setError(true),
    );
  }, [number, level]);

  if (!isLevel(level) || error) {
    return (
      <p className="py-20 text-center">
        <Link href={isLevel(level) ? levelPath(level) : "/"} className="btn btn-primary">
          {t("back")}
        </Link>
      </p>
    );
  }
  if (!data || !settings || !providers) return <p className="py-20 text-center text-muted">{t("loading")}</p>;
  const { topic } = data;
  const setTab = (id: Tab) => router.replace(topicPath(level, number, id), { scroll: false });

  const startTalk = async () => {
    unlockSpeech(); // the tap is the gesture the browser needs before the partner may speak
    setStarting(true);
    try {
      const d = await api<{ session: { id: string } }>("/api/sessions", { method: "POST", body: JSON.stringify({ level, bookTopic: topic.number }) });
      router.push(chatPath(level, d.session.id, true));
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className={`level-${level.toLowerCase()} max-w-3xl mx-auto space-y-5`}>
      <Link href={levelPath(level)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink min-h-[40px] -my-2 pe-3">
        <IconArrow size={16} className="rotate-180 rtl:rotate-0" /> {t("book_back_level")} · {t(`lvl_${level}_name` as TKey)}
      </Link>

      <header className="card overflow-hidden">
        <div className="bg-accent-soft p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-sm font-bold text-white bg-accent de">{level}</span>
            <span className="text-sm font-bold text-accent tabular-nums">#{topic.number}</span>
          </div>
          <h1 className="text-2xl font-extrabold">{topic.title_ar}</h1>
          <p dir="ltr" lang="de" className="de text-lg font-semibold text-muted text-start">
            {topic.title_de}
          </p>
          <p className="text-sm leading-relaxed">{topic.intro_ar}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-muted mb-2">{t("book_vocab")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {topic.vocab.map((v) => (
              <li key={v.de} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs" title={v.ar}>
                <span dir="ltr" lang="de" className="de font-semibold">
                  {v.de}
                </span>{" "}
                <span className="text-muted">· {v.ar}</span>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <div role="tablist" aria-label={topic.title_de} className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1 sticky top-16 z-10">
        {TABS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold min-h-[44px] ${tab === x.id ? "bg-surface shadow text-ink" : "text-muted"}`}
          >
            <x.icon size={16} /> <span className="truncate hidden sm:inline">{t(x.key as TKey)}</span>
            <span className="truncate sm:hidden">{t(`${x.key}_short` as TKey)}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "shadow" && (
          <Shadowing
            level={level}
            settings={settings}
            providers={providers}
            scores={data.scores}
            track
            topic={topic.number}
            mode="shadow"
            groups={topic.sections.map((s) => ({
              key: `s${s.number}`,
              title_de: `${s.number}. ${s.title_de}`,
              title_ar: s.title_ar,
              items: s.sentences.map((x) => ({ n: x.n, key: `n${x.n}`, de: x.de, ar: x.ar })),
            }))}
          />
        )}
        {tab === "talk" && (
          <section className="card p-5 space-y-4">
            <h2 className="text-xl font-bold">{t("talk_title")}</h2>
            <p className="text-sm leading-relaxed">{providers.llm === "mock" ? t("talk_mock") : t("talk_ai")}</p>
            <div>
              <p className="text-sm font-semibold mb-2">{t("talk_sections")}</p>
              <ol className="space-y-1.5">
                {topic.sections.map((s) => (
                  <li key={s.number} className="flex items-baseline gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    <b className="tabular-nums text-accent">{s.number}.</b>
                    <span>{s.title_ar}</span>
                    <span dir="ltr" lang="de" className="de text-muted ms-auto">
                      {s.title_de}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <button className="btn btn-primary w-full text-lg !py-4" style={{ background: "var(--accent)", color: "#fff" }} onClick={() => void startTalk()} disabled={starting}>
              <IconMic /> {t("talk_start")}
            </button>
          </section>
        )}
        {tab === "grammar" && <GrammarTab level={level} grammar={topic.grammar} settings={settings} providers={providers} />}
      </div>
    </div>
  );
}
