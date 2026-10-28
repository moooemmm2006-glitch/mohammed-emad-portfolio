"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ServerProviders } from "@/lib/client/api";
import { fill } from "@/lib/client/i18n";
import { unlockSpeech } from "@/lib/client/tts";
import { useUI } from "@/lib/client/ui";
import { compareSentence, CORRECT_AT, statusFor, type Comparison } from "@/lib/bookCompare";
import type { Level } from "@/lib/levels";
import type { Settings } from "@/lib/settings";
import { IconEye, IconEyeOff, IconMic, IconPlay, IconRepeat, IconStop } from "../Icons";
import { useVoice } from "./useVoice";
import { useSite } from "../site/SiteProvider";
import { useExerciseGuard } from "@/lib/client/focusStore";

export interface PracticeItem {
  /** Global book sentence number; undefined for grammar examples (not saved to progress). */
  n?: number;
  key: string;
  de: string;
  ar: string;
}

export interface PracticeGroup {
  key: string;
  title_de?: string;
  title_ar?: string;
  items: PracticeItem[];
}

interface Props {
  level: Level;
  groups: PracticeGroup[];
  settings: Settings;
  providers: ServerProviders;
  /** Best earlier score per sentence number. */
  scores?: Record<number, number>;
  /** Save attempts and offer a report (book sentences); false for grammar examples. */
  track: boolean;
  topic: number | null;
  mode: "shadow" | "review" | "grammar";
}

interface Result {
  said: string;
  cmp: Comparison;
}

/** "اسمع وكرر": the app reads a sentence, the learner repeats it, the app compares word by word. */
export function Shadowing({ level, groups, settings, providers, scores: initialScores = {}, track, topic, mode }: Props) {
  const { t } = useUI();
  const router = useRouter();
  const { offerPause } = useSite();
  const voice = useVoice(level, settings, providers);
  useExerciseGuard(voice.phase !== "idle"); // the ⏱️ celebration waits while a sentence is played / heard
  const { stop: stopVoice, say, listen } = voice;
  const items = groups.flatMap((g) => g.items);
  const [current, setCurrent] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [scores, setScores] = useState(initialScores);
  const [reverse, setReverse] = useState(false);
  const [showAr, setShowAr] = useState(true);
  const [auto, setAuto] = useState(false);
  const [noSpeech, setNoSpeech] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoRef = useRef(false);
  const runId = useRef(0);
  const heard = useRef<{ n: number; said: string }[]>([]);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const practise = useCallback(
    async (item: PracticeItem) => {
      const id = ++runId.current;
      setCurrent(item.key);
      setNoSpeech(false);
      rowRefs.current[item.key]?.scrollIntoView({ block: "center", behavior: "smooth" });
      // Normal: hear it first. Reverse (the book's main exercise): Arabic only, say it, then hear it.
      if (!reverse) await say(item.de);
      if (id !== runId.current) return false;
      const said = await listen(reverse ? 14000 : 10000);
      if (id !== runId.current) return false;
      if (!said) {
        setNoSpeech(true);
        return false;
      }
      const cmp = compareSentence(item.de, said);
      setResults((r) => ({ ...r, [item.key]: { said, cmp } }));
      if (item.n) {
        const n = item.n;
        heard.current.push({ n, said });
        setScores((s) => ({ ...s, [n]: Math.max(s[n] ?? 0, cmp.score) }));
        if (track) void api("/api/book/attempts", { method: "POST", body: JSON.stringify({ heard: [{ n, said }] }) }).catch(() => {});
      }
      if (reverse && id === runId.current) await say(item.de);
      return true;
    },
    [reverse, say, listen, track],
  );

  const stopAll = useCallback(() => {
    autoRef.current = false;
    setAuto(false);
    runId.current++;
    stopVoice();
  }, [stopVoice]);

  // Auto-play: through the sentences one by one, hands-free, from the current one.
  const runAuto = useCallback(async () => {
    unlockSpeech();
    autoRef.current = true;
    setAuto(true);
    const start = Math.max(0, items.findIndex((x) => x.key === current));
    for (let i = start; i < items.length && autoRef.current; i++) {
      const ok = await practise(items[i]);
      if (!ok || !autoRef.current) break;
      await new Promise((r) => setTimeout(r, 900));
    }
    autoRef.current = false;
    setAuto(false);
  }, [items, current, practise]);

  // Stop speaking/listening when leaving the page (stopAll is stable).
  useEffect(() => () => stopAll(), [stopAll]);

  const finish = async () => {
    stopAll();
    if (!heard.current.length || !track) return;
    setSaving(true);
    try {
      const r = await api<{ id: string }>("/api/book/practice", {
        method: "POST",
        body: JSON.stringify({ topic, mode: mode === "shadow" && reverse ? "reverse" : mode, heard: heard.current }),
      });
      offerPause(); // practice finished: maybe offer a break on the report page (max once a day)
      router.push(`/reports/practice/${r.id}`);
    } catch {
      setSaving(false);
    }
  };

  const tried = Object.values(results);
  const right = tried.filter((r) => r.cmp.score >= CORRECT_AT).length;

  return (
    <div className="space-y-5 pb-44">
      <p className="text-sm text-muted">{reverse ? t("sh_reverse_hint") : t("sh_tap")}</p>

      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          {(g.title_de || g.title_ar) && (
            <h3 className="font-bold flex flex-wrap items-baseline gap-x-2">
              {g.title_ar && <span>{g.title_ar}</span>}
              {g.title_de && (
                <span className="de text-sm text-muted font-semibold" dir="ltr">
                  {g.title_de}
                </span>
              )}
            </h3>
          )}
          <ul className="space-y-2">
            {g.items.map((it) => {
              const res = results[it.key];
              const best = it.n ? scores[it.n] : undefined;
              const active = current === it.key;
              return (
                <li
                  key={it.key}
                  ref={(el) => {
                    rowRefs.current[it.key] = el;
                  }}
                  className={`rounded-2xl border p-3 sm:p-4 transition ${active ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}
                >
                  <button
                    type="button"
                    className="w-full text-start flex items-start gap-3"
                    onClick={() => {
                      unlockSpeech();
                      stopAll();
                      void practise(it);
                    }}
                    aria-label={reverse ? it.ar : it.de}
                  >
                    <span className="shrink-0 mt-1 text-xs tabular-nums text-muted w-8">{it.n ?? ""}</span>
                    <span className="flex-1 min-w-0">
                      {reverse && !res ? (
                        <span className="block text-lg font-semibold">{it.ar}</span>
                      ) : (
                        <span dir="ltr" lang="de" className="block de text-lg font-semibold text-start">
                          {res ? <Marked cmp={res.cmp} /> : it.de}
                        </span>
                      )}
                      {(showAr || reverse) && !(reverse && !res) && <span className="block text-sm text-muted mt-0.5">{it.ar}</span>}
                    </span>
                    <ScoreBadge score={res?.cmp.score ?? best} fresh={!!res} />
                  </button>
                  {active && res && (
                    <div className="mt-2 ps-11 text-sm space-y-1" role="status">
                      <p className={res.cmp.status === "correct" ? "text-ok font-semibold" : res.cmp.status === "partial" ? "text-gold font-semibold" : "text-danger font-semibold"}>
                        {t(res.cmp.status === "correct" ? "sh_correct" : res.cmp.status === "partial" ? "sh_partial" : "sh_wrong")} · {res.cmp.score}%
                      </p>
                      <p className="text-muted">
                        {t("sh_heard")}{" "}
                        <span dir="ltr" lang="de" className="de">
                          {res.said}
                        </span>
                      </p>
                    </div>
                  )}
                  {active && noSpeech && !res && <p className="mt-2 ps-11 text-sm text-danger">{t("sh_no_speech")}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* control bar */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-20 pointer-events-none">
        <div className="mx-auto max-w-3xl px-3 pb-3 pointer-events-auto">
          <div className="card p-3 space-y-2 shadow-2xl">
            <div className="flex items-center gap-2 min-h-[28px] text-sm" aria-live="polite">
              {voice.phase === "listening" ? (
                <>
                  <span className="relative flex w-3 h-3">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-danger opacity-60 animate-ping" />
                    <span className="relative inline-flex rounded-full w-3 h-3 bg-danger" />
                  </span>
                  <span className="font-semibold">{reverse ? t("sh_say_german") : t("sh_listen")}</span>
                  <span dir="ltr" className="de text-muted truncate">
                    {voice.live}
                  </span>
                  <button className="ms-auto chip min-h-[34px]" onClick={voice.finish}>
                    {t("sh_finished_speaking")}
                  </button>
                </>
              ) : voice.phase === "speaking" ? (
                <span className="text-muted">{t("sh_speaking")}</span>
              ) : (
                <span className="text-muted">{tried.length ? fill(t("sh_done_count"), { c: right, t: tried.length }) : t("sh_tap")}</span>
              )}
            </div>
            {voice.micError && <p className="text-xs text-danger">{t(voice.micError === "not-allowed" || voice.micError === "audio-capture" ? "err_mic_denied" : "err_no_stt")}</p>}
            {voice.audioError && <p className="text-xs text-danger">{t("err_audio")}</p>}
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              {auto ? (
                <button className="btn btn-primary !min-h-[42px] !px-3 flex-1 sm:flex-none whitespace-nowrap" onClick={stopAll}>
                  <IconStop size={16} /> {t("sh_stop")}
                </button>
              ) : (
                <button className="btn btn-primary !min-h-[42px] !px-3 flex-1 sm:flex-none whitespace-nowrap" onClick={() => void runAuto()} disabled={!voice.hasMic}>
                  <IconPlay size={16} /> {t("sh_auto")}
                </button>
              )}
              <button className="chip min-h-[42px]" aria-pressed={reverse} onClick={() => (stopAll(), setReverse((r) => !r))} title={t("sh_reverse_hint")}>
                <IconRepeat size={16} /> {t("sh_reverse")}
              </button>
              {/* Icon-only on phones so the bar stays one row. */}
              <button
                className="chip min-h-[42px] min-w-[42px] justify-center"
                aria-pressed={!showAr}
                onClick={() => setShowAr((v) => !v)}
                aria-label={showAr ? t("sh_hide_ar") : t("sh_show_ar")}
                title={showAr ? t("sh_hide_ar") : t("sh_show_ar")}
              >
                {showAr ? <IconEyeOff size={16} /> : <IconEye size={16} />} <span className="hidden sm:inline">{showAr ? t("sh_hide_ar") : t("sh_show_ar")}</span>
              </button>
              {track && (
                <button className="chip min-h-[42px] ms-auto" onClick={() => void finish()} disabled={!heard.current.length || saving} aria-label={t("sh_finish")}>
                  <IconMic size={16} /> <span className="hidden sm:inline">{t("sh_finish")}</span>
                  <span className="sm:hidden">{t("sh_finish_short")}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The book sentence with missed words marked. */
function Marked({ cmp }: { cmp: Comparison }) {
  return (
    <>
      {cmp.words.map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          <span className={w.ok === false ? "text-danger underline decoration-2 underline-offset-4" : w.ok ? "text-ok" : ""}>{w.text}</span>
        </span>
      ))}
    </>
  );
}

function ScoreBadge({ score, fresh }: { score?: number; fresh: boolean }) {
  if (score === undefined) return null;
  const st = statusFor(score);
  const cls = st === "correct" ? "bg-ok/15 text-ok" : st === "partial" ? "bg-gold/15 text-gold" : "bg-danger/10 text-danger";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${cls} ${fresh ? "" : "opacity-70"}`}>
      {st === "correct" ? "✓" : st === "partial" ? "~" : "✗"} {score}
    </span>
  );
}
