"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, useProviders } from "@/lib/client/api";
import { fill, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { blankOk, compareWritten, makeGap, pickWritingSentences, type GapExercise, type WrittenComparison } from "@/lib/bookWrite";
import type { BookSentence, BookTopic } from "@/lib/book";
import type { Level } from "@/lib/levels";
import type { WritingCheck } from "@/lib/writing";
import { IconArrow } from "../Icons";
import { TopicPicker } from "./ReadPanel";
import { ArabicText, TopicTitle, useBookTopic, useLevelTopics } from "./shared";

type Mode = "translate" | "complete" | "free";
const MODES: { id: Mode; key: TKey }[] = [
  { id: "translate", key: "write_translate" },
  { id: "complete", key: "write_complete" },
  { id: "free", key: "write_free" },
];

/** ✍️ Schreiben: translate into German, complete the sentence (no API key), free writing (with a key). */
export function WritePanel({ level }: { level: Level }) {
  const { t } = useUI();
  const { topics } = useLevelTopics(level);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<number | null>(null);
  const reload = useCallback(() => {
    api<{ scores: Record<string, number> }>(`/api/skills/scores?skill=write&level=${level}`).then((d) => setScores(d.scores), () => {});
  }, [level]);
  useEffect(reload, [reload]);

  if (open) return <WriteTopic n={open} onBack={() => setOpen(null)} onScored={reload} />;
  return (
    <TopicPicker
      topics={topics}
      title={t("write_pick")}
      badge={(tp) => {
        const best = Math.max(scores[`${tp.number}:0`] ?? -1, scores[`${tp.number}:1`] ?? -1);
        return best >= 0 ? `${best}%` : null;
      }}
      onPick={setOpen}
    />
  );
}

function WriteTopic({ n, onBack, onScored }: { n: number; onBack: () => void; onScored: () => void }) {
  const { t } = useUI();
  const data = useBookTopic(n);
  const [mode, setMode] = useState<Mode>("translate");
  const [run, setRun] = useState(0);
  const providers = useProviders();
  // Free writing needs an AI; without one its tab is simply not shown (no "needs an API key" notice).
  const modes = providers?.llm !== "anthropic" ? MODES.filter((m) => m.id !== "free") : MODES;
  if (!data) return <p className="text-muted">{t("loading")}</p>;
  const topic = data.topic;
  return (
    <div className="space-y-5">
      <button className="chip min-h-[40px]" onClick={onBack}>
        <IconArrow size={16} className="rotate-180 rtl:rotate-0" /> {t("read_back_topics")}
      </button>
      <header>
        <TopicTitle tp={topic} size="lg" />
      </header>
      <div role="tablist" className={`grid ${modes.length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-1 rounded-2xl bg-surface-2 p-1`}>
        {modes.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => (setMode(m.id), setRun((r) => r + 1))}
            className={`rounded-xl px-2 py-2.5 text-sm font-semibold min-h-[44px] ${mode === m.id ? "bg-surface shadow text-ink" : "text-muted"}`}
          >
            {t(m.key)}
          </button>
        ))}
      </div>
      {mode === "translate" && <TranslateRun key={`t${run}`} topic={topic} onDone={onScored} />}
      {mode === "complete" && <CompleteRun key={`c${run}`} topic={topic} onDone={onScored} />}
      {mode === "free" && <FreeWriting topic={topic} onDone={onScored} />}
    </div>
  );
}

const saveScore = (topic: number, part: number, score: number) =>
  api("/api/skills/score", { method: "POST", body: JSON.stringify({ skill: "write", topic, part, score }) }).catch(() => {});

function TranslateRun({ topic, onDone }: { topic: BookTopic; onDone: () => void }) {
  const { t } = useUI();
  const items = useMemo(() => pickWritingSentences(topic, Math.floor(Math.random() * 1e6), 6), [topic]);
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<WrittenComparison | null>(null);
  const scores = useRef<number[]>([]);
  const [finished, setFinished] = useState(false);
  const s = items[i];

  const check = () => {
    const r = compareWritten(s.de, typed);
    setResult(r);
    scores.current[i] = r.score;
  };
  const next = () => {
    if (i + 1 < items.length) {
      setI(i + 1);
      setTyped("");
      setResult(null);
    } else {
      setFinished(true);
      const avg = scores.current.reduce((a, b) => a + b, 0) / items.length;
      void saveScore(topic.number, 0, avg).then(onDone);
    }
  };
  if (!s) return null;
  if (finished) return <Done right={scores.current.filter((x) => x >= 85).length} total={items.length} />;
  return (
    <div className="card depth p-4 sm:p-5 space-y-3 rise-3d" key={s.n}>
      <p className="text-sm text-muted">
        {i + 1}/{items.length} · {t("write_translate_hint")}
      </p>
      <ArabicText block className="text-xl font-bold">
        {s.ar}
      </ArabicText>
      <textarea
        className="field min-h-[88px] de"
        dir="ltr"
        lang="de"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={t("write_placeholder")}
        autoCapitalize="sentences"
        spellCheck={false}
        disabled={!!result}
      />
      {result && <WrittenResult r={result} book={s} />}
      <div className="flex gap-2">
        {!result ? (
          <button className="btn btn-primary !min-h-[42px]" onClick={check} disabled={!typed.trim()}>
            {t("write_check")}
          </button>
        ) : (
          <button className="btn btn-primary !min-h-[42px]" onClick={next}>
            {t("write_next")}
          </button>
        )}
      </div>
    </div>
  );
}

function WrittenResult({ r, book }: { r: WrittenComparison; book: BookSentence }) {
  const { t } = useUI();
  const cls = { ok: "text-ok", missing: "text-danger underline decoration-2 underline-offset-4", wrong: "text-gold underline decoration-wavy underline-offset-4", extra: "text-muted line-through" };
  return (
    <div className="rounded-2xl bg-surface-2 p-3 space-y-2" role="status">
      <p className={`font-bold ${r.score >= 85 ? "text-ok" : r.score >= 50 ? "text-gold" : "text-danger"}`}>
        {t("write_score_label")}: {r.score}%
      </p>
      <p dir="ltr" lang="de" className="de text-lg text-start">
        {r.words.map((w, k) => (
          <span key={k}>
            {k > 0 && " "}
            <span className={cls[w.state]} title={w.typed ? `${w.typed} → ${w.text}` : undefined}>
              {w.text}
            </span>
            {w.typed && <span className="text-xs text-muted"> ({w.typed})</span>}
          </span>
        ))}
      </p>
      <p className="text-sm">
        <span className="text-muted">{t("write_book")} </span>
        <span dir="ltr" lang="de" className="de font-semibold">
          {book.de}
        </span>
      </p>
      <p className="text-xs text-muted flex flex-wrap gap-x-3">
        <span className="text-danger">▁ {t("write_missing")}</span>
        <span className="text-gold">〜 {t("write_wrong")}</span>
        <span className="line-through">{t("write_extra")}</span>
      </p>
      {r.umlautHint && <p className="text-sm">💡 {t("write_umlaut_hint")}</p>}
      {r.caseHint && <p className="text-sm">💡 {t("write_case_hint")}</p>}
    </div>
  );
}

function CompleteRun({ topic, onDone }: { topic: BookTopic; onDone: () => void }) {
  const { t } = useUI();
  const items = useMemo(
    () =>
      pickWritingSentences(topic, Math.floor(Math.random() * 1e6), 14)
        .map((s) => makeGap(s, topic))
        .filter((x): x is GapExercise => !!x)
        .slice(0, 6),
    [topic],
  );
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const right = useRef(0);
  const total = useRef(0);
  const [finished, setFinished] = useState(false);
  const ex = items[i];

  useEffect(() => setTyped(ex ? ex.answers.map(() => "") : []), [ex]);
  if (!ex) return null;
  if (finished) return <Done right={right.current} total={total.current} />;

  const check = () => {
    setChecked(true);
    ex.answers.forEach((a, k) => {
      total.current++;
      if (blankOk(a, typed[k] ?? "")) right.current++;
    });
  };
  const next = () => {
    if (i + 1 < items.length) {
      setI(i + 1);
      setChecked(false);
    } else {
      setFinished(true);
      void saveScore(topic.number, 1, (100 * right.current) / Math.max(1, total.current)).then(onDone);
    }
  };
  let blank = -1;
  return (
    <div className="card depth p-4 sm:p-5 space-y-3 rise-3d" key={ex.n}>
      <p className="text-sm text-muted">
        {i + 1}/{items.length} · {t("write_complete_hint")}
      </p>
      <ArabicText block className="text-muted">
        {ex.ar}
      </ArabicText>
      <p dir="ltr" lang="de" className="de text-lg leading-loose text-start">
        {ex.parts.map((p, k) => {
          if (p !== null) return <span key={k}>{p} </span>;
          const b = ++blank;
          const ok = checked && blankOk(ex.answers[b], typed[b] ?? "");
          return (
            <span key={k} className="inline-flex flex-col align-middle me-1">
              <input
                className={`field !min-h-[38px] !py-1 !px-2 !w-36 de ${checked ? (ok ? "!border-ok" : "!border-danger") : ""}`}
                dir="ltr"
                lang="de"
                value={typed[b] ?? ""}
                onChange={(e) => setTyped((xs) => xs.map((x, j) => (j === b ? e.target.value : x)))}
                disabled={checked}
                aria-label={`${t("write_complete_hint")} ${b + 1}`}
                spellCheck={false}
              />
              {checked && !ok && <span className="text-xs text-ok font-semibold">{ex.answers[b]}</span>}
            </span>
          );
        })}
      </p>
      {checked && (
        <p className="text-sm">
          <span className="text-muted">{t("write_book")} </span>
          <span dir="ltr" lang="de" className="de font-semibold">
            {ex.full}
          </span>
        </p>
      )}
      {!checked ? (
        <button className="btn btn-primary !min-h-[42px]" onClick={check} disabled={typed.every((x) => !x.trim())}>
          {t("write_check")}
        </button>
      ) : (
        <button className="btn btn-primary !min-h-[42px]" onClick={next}>
          {t("write_next")}
        </button>
      )}
    </div>
  );
}

function Done({ right, total }: { right: number; total: number }) {
  const { t } = useUI();
  return (
    <p className="card depth p-5 text-lg font-bold text-ok" role="status">
      {fill(t("write_done"), { c: right, t: total })}
    </p>
  );
}

function FreeWriting({ topic, onDone }: { topic: BookTopic; onDone: () => void }) {
  const { t } = useUI();
  const providers = useProviders();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WritingCheck | null>(null);
  const [error, setError] = useState(false);
  if (!providers) return null;

  const send = async () => {
    setBusy(true);
    setError(false);
    try {
      setResult(await api<WritingCheck>("/api/book/writing", { method: "POST", body: JSON.stringify({ topic: topic.number, text }) }));
      onDone();
    } catch (e) {
      setError(!(e instanceof ApiError && e.code === "need_api"));
    } finally {
      setBusy(false);
    }
  };
  const fixes = result?.corrections.filter((c) => !c.isCorrect) ?? [];
  return (
    <div className="card depth p-4 sm:p-5 space-y-3">
      <p className="text-sm">{t("write_free_hint")}</p>
      <textarea className="field min-h-[160px] de" dir="ltr" lang="de" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("write_placeholder")} maxLength={3000} />
      <button className="btn btn-primary !min-h-[42px]" onClick={() => void send()} disabled={busy || !text.trim()}>
        {busy ? t("loading") : t("write_free_send")}
      </button>
      {error && <p className="text-danger text-sm">{t("write_free_failed")}</p>}
      {result && (
        <div className="space-y-3" role="status">
          <h3 className="font-bold">{t("write_free_result")}</h3>
          {fixes.length === 0 && <p className="text-ok font-semibold">{t("write_free_none")}</p>}
          {fixes.map((c) => (
            <div key={c.turn} className="rounded-2xl border border-line p-3 space-y-1.5">
              <p className="text-sm">
                <span className="text-muted">{t("write_free_original")}: </span>
                <span dir="ltr" lang="de" className="de text-danger">
                  {c.original}
                </span>
              </p>
              <p>
                <span className="text-sm text-muted">{t("write_free_corrected")}: </span>
                <span dir="ltr" lang="de" className="de font-bold text-ok">
                  {c.corrected}
                </span>
              </p>
              <ul className="text-sm space-y-1">
                {c.fixes.map((f, k) => (
                  <li key={k}>
                    <span dir="ltr" className="de">
                      {f.wrong} → <b>{f.right}</b>
                    </span>{" "}
                    — <span lang="ar" dir="rtl">{f.explanation}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {fixes.length > 0 && <p className="text-xs text-muted">{t("write_free_saved")}</p>}
        </div>
      )}
    </div>
  );
}
