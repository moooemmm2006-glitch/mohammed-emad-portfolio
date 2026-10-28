"use client";

import { useCallback, useEffect, useState } from "react";
import { api, useProviders, useSettings } from "@/lib/client/api";
import { fill } from "@/lib/client/i18n";
import { unlockSpeech } from "@/lib/client/tts";
import { useUI } from "@/lib/client/ui";
import { makeSectionQuiz, quizScore, type QuizQuestion } from "@/lib/bookQuiz";
import type { BookTopic } from "@/lib/book";
import type { Level } from "@/lib/levels";
import { IconArrow, IconPlay, IconSparkle } from "../Icons";
import { useVoice } from "../book/useVoice";
import { ArabicText, TopicTitle, useBookTopic, useLevelTopics, type TopicCard } from "./shared";
import { TiltDiv } from "./Tilt";
import { useSite } from "../site/SiteProvider";

/** 📖 Lesen: each topic's sections as a continuous German text; tap a sentence for its meaning; a quiz per section. */
export function ReadPanel({ level }: { level: Level }) {
  const { t } = useUI();
  const { topics } = useLevelTopics(level);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<number | null>(null);

  const reload = useCallback(() => {
    api<{ scores: Record<string, number> }>(`/api/skills/scores?skill=read&level=${level}`).then((d) => setScores(d.scores), () => {});
  }, [level]);
  useEffect(reload, [reload]);

  if (open) return <ReadTopic n={open} level={level} scores={scores} onBack={() => setOpen(null)} onScored={reload} />;
  return (
    <TopicPicker
      topics={topics}
      title={t("read_pick")}
      badge={(tp) => {
        const passed = [1, 2, 3, 4, 5].filter((p) => (scores[`${tp.number}:${p}`] ?? 0) >= 80).length;
        return passed ? `${passed}/5` : null;
      }}
      onPick={setOpen}
    />
  );
}

export function TopicPicker({ topics, title, badge, onPick }: { topics: TopicCard[] | null; title: string; badge: (tp: TopicCard) => string | null; onPick: (n: number) => void }) {
  const { t } = useUI();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {!topics && <p className="text-muted">{t("loading")}</p>}
      <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics?.map((tp, i) => {
          const b = badge(tp);
          return (
            <li key={tp.number} className="rise-3d" style={{ ["--i" as string]: Math.min(i, 14) }}>
              <TiltDiv className="card depth h-full">
                <button className="w-full h-full text-start p-4 flex items-start gap-3" onClick={() => onPick(tp.number)}>
                  <span className="shrink-0 grid place-items-center w-9 h-9 rounded-full text-sm font-bold tabular-nums bg-accent-soft text-accent">{tp.number}</span>
                  <span className="min-w-0 flex-1">
                    <TopicTitle tp={tp} />
                  </span>
                  {b && <span className="chip text-xs text-ok shrink-0">✓ {b}</span>}
                </button>
              </TiltDiv>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ReadTopic({ n, level, scores, onBack, onScored }: { n: number; level: Level; scores: Record<string, number>; onBack: () => void; onScored: () => void }) {
  const { t } = useUI();
  const data = useBookTopic(n);
  const { settings } = useSettings();
  const providers = useProviders();
  const [picked, setPicked] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<number | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");

  if (!data || !settings || !providers) return <p className="text-muted">{t("loading")}</p>;
  const topic = data.topic;

  const newText = async () => {
    setAiState("loading");
    try {
      setAiText((await api<{ text: string }>("/api/book/reading-text", { method: "POST", body: JSON.stringify({ topic: topic.number }) })).text);
      setAiState("idle");
    } catch {
      setAiState("error");
    }
  };

  return (
    <div className="space-y-5">
      <button className="chip min-h-[40px]" onClick={onBack}>
        <IconArrow size={16} className="rotate-180 rtl:rotate-0" /> {t("read_back_topics")}
      </button>
      <header className="space-y-1">
        <TopicTitle tp={topic} size="lg" />
        <p className="text-sm text-muted">{t("read_tap_hint")}</p>
      </header>

      {providers.llm === "anthropic" && (
        <div className="card depth p-4 space-y-3">
          <button className="btn btn-ghost !min-h-[42px]" onClick={() => void newText()} disabled={aiState === "loading"}>
            <IconSparkle size={16} /> {aiState === "loading" ? t("read_ai_loading") : t("read_ai_text")}
          </button>
          {aiState === "error" && <p className="text-sm text-danger">{t("read_ai_failed")}</p>}
          {aiText && (
            <div>
              <h3 className="font-bold mb-1">{t("read_ai_title")}</h3>
              <SpeakableText level={level} text={aiText} settings={settings} providers={providers} />
            </div>
          )}
        </div>
      )}

      {topic.sections.map((sec) => {
        const best = scores[`${topic.number}:${sec.number}`];
        const pickedHere = sec.sentences.find((s) => s.n === picked);
        return (
          <section key={sec.number} className="card depth p-4 sm:p-5 space-y-3">
            <h3 className="font-bold flex flex-wrap items-baseline gap-x-2">
              <span className="text-accent">{fill(t("read_section"), { n: sec.number })}</span>
              <span dir="ltr" lang="de" className="de">
                {sec.title_de}
              </span>
              <ArabicText className="text-sm text-muted font-normal">{sec.title_ar}</ArabicText>
            </h3>
            <p dir="ltr" lang="de" className="de text-lg leading-loose text-start">
              {sec.sentences.map((s) => (
                <span key={s.n}>
                  <button
                    className={`inline text-start rounded px-0.5 -mx-0.5 transition-colors ${picked === s.n ? "bg-accent-soft text-accent" : "hover:bg-surface-2"}`}
                    onClick={() => setPicked(picked === s.n ? null : s.n)}
                    aria-expanded={picked === s.n}
                  >
                    {s.de}
                  </button>{" "}
                </span>
              ))}
            </p>
            {pickedHere && <MeaningBox level={level} de={pickedHere.de} ar={pickedHere.ar} settings={settings} providers={providers} />}
            {quiz === sec.number ? (
              <Quiz topic={topic} section={sec.number} onDone={onScored} onClose={() => setQuiz(null)} />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn btn-primary !min-h-[42px]" style={{ background: "var(--accent)" }} onClick={() => setQuiz(sec.number)}>
                  {t("read_quiz_start")}
                </button>
                {best !== undefined && <span className="text-sm text-muted">{fill(t("read_best"), { s: best })}</span>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function MeaningBox({ level, de, ar, settings, providers }: { level: Level; de: string; ar: string; settings: NonNullable<ReturnType<typeof useSettings>["settings"]>; providers: NonNullable<ReturnType<typeof useProviders>> }) {
  const { t } = useUI();
  const voice = useVoice(level, settings, providers);
  return (
    <div className="rounded-2xl bg-accent-soft p-3 flex items-start gap-3" role="status">
      <button
        className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-surface border border-line"
        aria-label={`${t("read_play")}: ${de}`}
        onClick={() => {
          unlockSpeech();
          void voice.say(de);
        }}
      >
        <IconPlay size={16} />
      </button>
      <div className="min-w-0">
        <p dir="ltr" lang="de" className="de font-semibold text-start">
          {de}
        </p>
        <ArabicText block>{ar}</ArabicText>
      </div>
    </div>
  );
}

/** A text (e.g. the AI text) whose sentences can be tapped to hear them. */
function SpeakableText({ level, text, settings, providers }: { level: Level; text: string; settings: NonNullable<ReturnType<typeof useSettings>["settings"]>; providers: NonNullable<ReturnType<typeof useProviders>> }) {
  const voice = useVoice(level, settings, providers);
  const parts = text.split(/(?<=[.!?])\s+/);
  return (
    <p dir="ltr" lang="de" className="de text-lg leading-loose text-start">
      {parts.map((p, i) => (
        <span key={i}>
          <button
            className="inline text-start rounded px-0.5 hover:bg-surface-2"
            onClick={() => {
              unlockSpeech();
              void voice.say(p);
            }}
          >
            {p}
          </button>{" "}
        </span>
      ))}
    </p>
  );
}

function Quiz({ topic, section, onDone, onClose }: { topic: BookTopic; section: number; onDone: () => void; onClose: () => void }) {
  const { t } = useUI();
  const [questions] = useState<QuizQuestion[]>(() => makeSectionQuiz(topic, section, Math.floor(Math.random() * 1e6)));
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);
  const { offerPause } = useSite();
  const q = questions[i];
  const chosen = answers[i];

  const finish = async () => {
    setFinished(true);
    await api("/api/skills/score", { method: "POST", body: JSON.stringify({ skill: "read", topic: topic.number, part: section, score: quizScore(questions, answers) }) }).catch(() => {});
    onDone();
    offerPause(); // the quiz is over: maybe offer a break (max once a day)
  };

  if (!questions.length) return null;
  if (finished) {
    const right = questions.filter((x, k) => answers[k] === x.answer).length;
    return (
      <div className="rounded-2xl border border-line p-4 space-y-3" role="status">
        <p className="text-lg font-bold">{fill(t("read_result"), { c: right, t: questions.length })}</p>
        <button className="btn btn-ghost !min-h-[40px]" onClick={onClose}>
          {t("read_again")}
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-line p-4 space-y-3 rise-3d">
      <p className="text-sm text-muted">
        {t("read_quiz")} · {i + 1}/{questions.length}
      </p>
      <p className="font-semibold">{q.kind === "meaning" ? t("read_quiz_meaning") : t("read_quiz_gap")}</p>
      <p dir="ltr" lang="de" className="de text-lg font-bold text-start">
        {q.kind === "meaning" ? q.de : q.text}
      </p>
      {q.kind === "gap" && <ArabicText block className="text-sm text-muted">{q.ar}</ArabicText>}
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o, k) => {
          const state = chosen === null ? "" : k === q.answer ? "border-ok bg-ok/10" : k === chosen ? "border-danger bg-danger/10" : "opacity-60";
          return (
            <button
              key={k}
              className={`rounded-xl border border-line px-3 py-2.5 text-start min-h-[44px] ${state}`}
              disabled={chosen !== null}
              onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? k : x)))}
              {...(q.kind === "meaning" ? { lang: "ar", dir: "rtl" } : { lang: "de", dir: "ltr" })}
            >
              {o}
            </button>
          );
        })}
      </div>
      {chosen !== null && (
        <p className={chosen === q.answer ? "text-ok font-semibold" : "text-danger font-semibold"} role="status">
          {chosen === q.answer ? t("quiz_correct") : `${t("quiz_wrong")} ${q.options[q.answer]}`}
        </p>
      )}
      {chosen !== null && (
        <button className="btn btn-primary !min-h-[42px]" onClick={() => (i + 1 < questions.length ? setI(i + 1) : void finish())}>
          {t("read_next")}
        </button>
      )}
    </div>
  );
}
