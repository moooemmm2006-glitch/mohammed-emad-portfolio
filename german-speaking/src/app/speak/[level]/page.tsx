"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Conversation, type UITurn } from "@/components/Conversation";
import { IconArrow, IconMic } from "@/components/Icons";
import { MicCheck } from "@/components/MicCheck";
import { api, useProviders, useSettings } from "@/lib/client/api";
import { unlockSpeech } from "@/lib/client/tts";
import { useUI } from "@/lib/client/ui";
import { isLevel, LEVEL_CONFIG, type Level } from "@/lib/levels";

interface SessionPayload {
  session: { id: string; level: string; focusTag: string | null; status: string };
  turns: { id: number; role: "user" | "partner"; text: string; confidence: number | null }[];
}

export default function LevelPageWrapper() {
  return (
    <Suspense>
      <LevelPage />
    </Suspense>
  );
}

function LevelPage() {
  const { t, lang } = useUI();
  const params = useParams<{ level: string }>();
  const search = useSearchParams();
  const resumeId = search.get("session");
  const level = params.level?.toUpperCase();
  const { settings, update } = useSettings();
  const providers = useProviders();

  const [topic, setTopic] = useState<string | null>(null);
  const [stage, setStage] = useState<"intro" | "mic" | "chat">("intro");
  const [session, setSession] = useState<{ id: string; focus: string | null; turns: UITurn[]; greet: boolean; resumed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!resumeId) return;
    api<SessionPayload>(`/api/sessions/${resumeId}`).then(
      (d) => {
        setSession({
          id: d.session.id,
          focus: d.session.focusTag,
          turns: d.turns.map((x) => ({ key: `db${x.id}`, role: x.role, text: x.text, confidence: x.confidence })),
          greet: d.turns.length === 0,
          resumed: d.turns.length > 0,
        });
        setStage("chat");
      },
      () => setError(t("err_api")),
    );
  }, [resumeId, t]);

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

  const create = async () => {
    setStarting(true);
    setError(null);
    try {
      const d = await api<{ session: { id: string }; focus: string | null }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ level, topic }),
      });
      setSession({ id: d.session.id, focus: d.focus, turns: [], greet: true, resumed: false });
      setStage("chat");
    } catch {
      setError(t("err_api"));
    } finally {
      setStarting(false);
    }
  };

  const start = () => {
    unlockSpeech(); // this tap is the user gesture browsers need before the partner may speak
    if (settings && !settings.micTested) setStage("mic");
    else void create();
  };

  if (!settings || !providers) return <p className="px-4 py-20 text-center text-muted">{t("loading")}</p>;

  if (stage === "chat" && session) {
    return (
      <Conversation
        level={level}
        sessionId={session.id}
        initialTurns={session.turns}
        greet={session.greet}
        resumed={session.resumed}
        focusTag={session.focus}
        settings={settings}
        updateSettings={update}
        providers={providers}
      />
    );
  }

  if (stage === "mic") {
    return (
      <div className="px-4 py-6">
      <MicCheck
        level={level}
        settings={settings}
        useServerTts={settings.ttsProvider === "server" || (settings.ttsProvider === "auto" && providers.tts !== "webspeech")}
        onDone={() => {
          unlockSpeech();
          void update({ micTested: true });
          void create();
        }}
      />
      </div>
    );
  }

  const p = cfg.persona;
  return (
    <div className={`level-${level.toLowerCase()} max-w-2xl mx-auto space-y-6 px-4 py-6`}>
      <Link href="/speak" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink md:hidden min-h-[40px] -my-2 pe-3">
        <IconArrow size={16} className="rotate-180 rtl:rotate-0" /> {t("back")}
      </Link>
      <div className="card overflow-hidden">
        <div className="bg-accent-soft p-6 flex items-center gap-5">
          <Avatar level={level} size={112} scene />
          <div>
            <span className="rounded-full px-2.5 py-0.5 text-sm font-bold text-white bg-accent de">{level}</span>
            <h1 className="text-2xl font-extrabold mt-1">{cfg.info.name[lang]}</h1>
            {cfg.info.note && <p className="text-sm text-muted">{cfg.info.note[lang]}</p>}
            <p className="text-muted">
              {t("level_partner")}: <span className="de font-semibold text-ink">{level === "B2" ? "Dr. Tobias Wendt" : p.name}</span>
            </p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <p>
            <b className="text-accent">{t("level_topics")}:</b> {cfg.info.topics[lang]}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cfg.info.exampleTopics.map((x) => (
              <span key={x.en} className="rounded-full bg-accent-soft text-accent px-2.5 py-0.5 text-xs font-semibold">
                {x[lang]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <section>
        <h2 className="font-bold mb-3">{t("conv_topic_title")}</h2>
        <div className="flex flex-wrap gap-2">
          <button className="chip" aria-pressed={topic === null} onClick={() => setTopic(null)}>
            {t("conv_topic_free")}
          </button>
          {cfg.topics.map((tp) => (
            <button key={tp.id} className="chip" aria-pressed={topic === tp.de} onClick={() => setTopic(tp.de)}>
              <span>{lang === "ar" ? tp.ar : tp.en}</span>
              {tp.business && <span className="text-[10px] rounded-full bg-surface-2 px-1.5">💼 {t("conv_topic_business")}</span>}
            </button>
          ))}
        </div>
        {topic && <p className="mt-2 text-sm text-muted de">{topic}</p>}
      </section>

      {providers.llm === "mock" && <p className="rounded-xl bg-surface-2 px-4 py-2 text-sm text-muted">{t("mock_banner")}</p>}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}

      <button className="btn btn-primary w-full text-lg !py-4 bg-accent" style={{ background: "var(--accent)", color: "#fff" }} onClick={start} disabled={starting}>
        <IconMic /> <span>{t("conv_start")}</span>
      </button>
    </div>
  );
}
