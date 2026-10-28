"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/client/api";
import { exerciseOpen, focusTimer, onExerciseChange, useTimer } from "@/lib/client/focusStore";
import { playSoftChime, unlockFocusAudio } from "@/lib/client/focusSound";
import { fill } from "@/lib/client/i18n";
import { useMe } from "@/lib/client/me";
import { useUI } from "@/lib/client/ui";
import { clampMinutes, FOCUS_MAX, FOCUS_MIN, FOCUS_PRESETS, formatClock, isDone, isPaused, progressOf, remainingMs, type BadgeId, type FocusStats, type TimerState } from "@/lib/focusShared";
import { isLevel } from "@/lib/levels";
import { IconX } from "../Icons";

// ⏱️ The optional study timer: a small header button; while running only a thin ring fills slowly.
// It never starts by itself, never covers a lesson and never ends in the middle of an exercise.

const Celebration = dynamic(() => import("./Celebration"), { ssr: false });

/** A tick for the parts that show the time (only while visible to the learner). */
function useTick(active: boolean, every = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((n) => n + 1), every);
    return () => clearInterval(id);
  }, [active, every]);
}

function Ring({ timer, size = 40 }: { timer: TimerState; size?: number }) {
  useTick(true, 5000); // the ring moves slowly; no running numbers in the header
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const p = progressOf(timer);
  const color = timer.phase === "break" ? "#16a34a" : "var(--level-c, #64748b)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={3} />
      <circle className="focus-ring" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} opacity={isPaused(timer) ? 0.5 : 1} />
    </svg>
  );
}

/** Header button: opens the setup, or (while running) a tiny card with the time and controls. */
export function FocusButton() {
  const { t } = useUI();
  const { me } = useMe();
  const timer = useTimer();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  if (!me) return null;
  const running = !!timer && !isDone(timer);
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        className="btn btn-ghost relative !px-0 w-[38px] sm:w-10 !min-h-[38px] sm:!min-h-[40px] text-base"
        aria-label={t("focus_button")}
        title={t("focus_button")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {running && <Ring timer={timer} />}
        <span aria-hidden="true">{timer?.phase === "break" && running ? "☕" : "⏱️"}</span>
      </button>
      {open && (
        <div role="dialog" aria-label={running ? t("focus_button") : t("focus_title")} className="focus-pop fixed sm:absolute inset-x-3 sm:inset-x-auto top-14 sm:top-full sm:mt-2 sm:end-0 z-50 sm:w-80 rounded-3xl p-4 rise-3d">
          {running ? <RunningCard timer={timer} onClose={() => setOpen(false)} /> : <SetupCard onStarted={() => setOpen(false)} />}
        </div>
      )}
    </div>
  );
}

function SetupCard({ onStarted }: { onStarted: () => void }) {
  const { t } = useUI();
  const { me, setPrefs } = useMe();
  const last = me?.prefs?.focusMinutes ?? 25;
  const [minutes, setMinutes] = useState(last);
  const [custom, setCustom] = useState(!FOCUS_PRESETS.includes(last as (typeof FOCUS_PRESETS)[number]));
  const [goal, setGoal] = useState("");
  const [sound, setSound] = useState(me?.prefs?.focusSound ?? true);
  const [breakOn, setBreakOn] = useState(me?.prefs?.focusBreak ?? true);
  const breakMin = me?.prefs?.breakMinutes ?? 5;

  const start = () => {
    const m = clampMinutes(minutes);
    unlockFocusAudio(); // this tap lets the browser play the celebration later
    setPrefs({ focusMinutes: m, focusSound: sound, focusBreak: breakOn }); // remembered per account
    focusTimer.start("focus", m, goal);
    onStarted();
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start();
      }}
    >
      <h2 className="text-lg font-extrabold text-center">{t("focus_title")}</h2>
      <div className="grid grid-cols-3 gap-2">
        {FOCUS_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={!custom && minutes === m}
            className={`rounded-2xl border px-2 py-3 font-extrabold text-lg leading-tight transition ${!custom && minutes === m ? "border-[var(--level-c)] bg-[color-mix(in_oklab,var(--level-c)_14%,var(--surface))]" : "border-line hover:bg-surface-2"}`}
            onClick={() => (setCustom(false), setMinutes(m))}
          >
            {fill(t("focus_min"), { n: m })}
            {m === 25 && <span className="block text-[11px] font-bold text-muted">{t("focus_best")}</span>}
          </button>
        ))}
      </div>
      {custom ? (
        <label className="block text-sm">
          <span className="block mb-1 text-muted">{t("focus_custom_label")}</span>
          <input type="number" min={FOCUS_MIN} max={FOCUS_MAX} inputMode="numeric" className="w-full rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px] tabular-nums" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} autoFocus />
        </label>
      ) : (
        <button type="button" className="text-sm font-semibold text-muted underline underline-offset-4 min-h-[32px]" onClick={() => setCustom(true)}>
          {t("focus_custom")}
        </button>
      )}
      <label className="block text-sm">
        <span className="block mb-1 font-semibold">{t("focus_goal")}</span>
        <input dir="auto" maxLength={140} className="w-full rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" placeholder={t("focus_goal_ph")} value={goal} onChange={(e) => setGoal(e.target.value)} />
      </label>
      <Switch label={t("focus_sound")} checked={sound} onChange={setSound} />
      <Switch label={fill(t("focus_break_after"), { n: breakMin })} checked={breakOn} onChange={setBreakOn} />
      <button className="btn btn-primary w-full text-lg" style={{ background: "var(--level-c, var(--brand))", color: "#fff" }}>
        {t("focus_start")}
      </button>
    </form>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm cursor-pointer min-h-[36px]">
      <span>{label}</span>
      <input type="checkbox" role="switch" className="w-5 h-5 accent-[var(--level-c)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function RunningCard({ timer, onClose }: { timer: TimerState; onClose: () => void }) {
  const { t } = useUI();
  const [confirm, setConfirm] = useState(false);
  useTick(true); // only this small card shows seconds
  const paused = isPaused(timer);
  const left = formatClock(remainingMs(timer));
  return (
    <div className="space-y-3 text-center">
      <p className="text-sm text-muted">{paused ? t("focus_paused") : timer.phase === "break" ? t("focus_break_label") : t("focus_button")}</p>
      <p className="text-4xl font-extrabold tabular-nums" dir="ltr">
        {left}
      </p>
      {timer.goal && (
        <p className="text-sm rounded-xl bg-surface-2 px-3 py-2" dir="auto">
          🎯 {timer.goal}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="btn btn-ghost !px-2 !min-h-[40px] text-sm" onClick={() => (paused ? focusTimer.resume() : focusTimer.pause())}>
          {paused ? `▶ ${t("focus_resume")}` : `⏸ ${t("focus_pause")}`}
        </button>
        <button type="button" className="btn btn-ghost !px-2 !min-h-[40px] text-sm" onClick={() => focusTimer.restart()}>
          ↺ {t("focus_restart")}
        </button>
        {confirm ? (
          <button type="button" className="btn btn-ghost !px-2 !min-h-[40px] text-sm text-danger border-danger" onClick={() => (focusTimer.clear(), onClose())}>
            {t("focus_cancel_confirm")}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost !px-2 !min-h-[40px] text-sm" onClick={() => setConfirm(true)}>
            ✕ {t("focus_cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

interface Done {
  minutes: number;
  goal: string;
  id: string | null;
  stats: FocusStats | null;
  newBadges: BadgeId[];
}

/**
 * Mounted once for logged-in learners: notices the end (from the end timestamp, also after a refresh
 * or when the tab was in the background), waits for an open exercise (max 2 minutes), then celebrates;
 * shows the time in the tab title while the tab is hidden.
 */
export function FocusController() {
  const { t } = useUI();
  const { me } = useMe();
  const path = usePathname();
  const timer = useTimer();
  const [, setWake] = useState(0);
  const [done, setDone] = useState<Done | null>(null);
  const [breakOver, setBreakOver] = useState(false);
  const wake = useCallback(() => setWake((n) => n + 1), []);
  const prefs = me?.prefs;

  // Wake up exactly at the end, when the tab comes back, and when an exercise closes.
  useEffect(() => {
    if (!timer || isPaused(timer)) return;
    const id = setTimeout(wake, remainingMs(timer) + 60);
    return () => clearTimeout(id);
  }, [timer, wake]);
  useEffect(() => {
    document.addEventListener("visibilitychange", wake);
    const off = onExerciseChange(wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      off();
    };
  }, [wake]);

  // The end (checked on every render: the wake-ups above re-render this component).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!me || !timer || !isDone(timer) || done) return;
    const endedAt = timer.endsAt ?? Date.now();
    if (timer.phase === "focus" && exerciseOpen() && Date.now() - endedAt < 120_000) {
      const id = setTimeout(wake, endedAt + 120_000 - Date.now() + 50); // never later than 2 minutes
      return () => clearTimeout(id);
    }
    const finished = focusTimer.take();
    if (!finished) return;
    if (finished.phase === "break") {
      if (prefs?.focusSound !== false) playSoftChime();
      setBreakOver(true);
      return;
    }
    setDone({ minutes: finished.minutes, goal: finished.goal, id: null, stats: null, newBadges: [] });
    const level = path.match(/^\/level\/([a-z0-9]+)/i)?.[1]?.toUpperCase();
    void api<{ id: string; stats: FocusStats; newBadges: BadgeId[] }>("/api/focus/sessions", {
      method: "POST",
      body: JSON.stringify({ startedAt: finished.startedAt, minutes: finished.minutes, goal: finished.goal || null, level: isLevel(level) ? level : null, tz: new Date().getTimezoneOffset() }),
    }).then(
      (r) => setDone((d) => (d ? { ...d, id: r.id, stats: r.stats, newBadges: r.newBadges } : d)),
      () => {},
    );
  });

  // "⏱️ 12:30 – بتذاكر" in the tab title while the tab is hidden.
  useEffect(() => {
    if (!timer || isPaused(timer)) return;
    const base = document.title;
    let shown = false;
    const update = () => {
      if (document.hidden && !isDone(timer)) {
        document.title = fill(t(timer.phase === "break" ? "focus_tab_break" : "focus_tab_title"), { t: formatClock(remainingMs(timer)) });
        shown = true;
      } else if (shown) {
        document.title = base;
        shown = false;
      }
    };
    const id = setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", update);
      if (shown) document.title = base;
    };
  }, [timer, t]);

  useEffect(() => {
    if (!breakOver) return;
    const id = setTimeout(() => setBreakOver(false), 8000);
    return () => clearTimeout(id);
  }, [breakOver]);

  if (!me) return null;
  const breakMinutes = prefs?.focusBreak === false ? null : (prefs?.breakMinutes ?? 5);
  return (
    <>
      {done && (
        <Celebration
          minutes={done.minutes}
          goal={done.goal}
          stats={done.stats}
          newBadges={done.newBadges}
          sound={prefs?.focusSound !== false}
          breakMinutes={breakMinutes}
          onGoal={(yes) => done.id && void api(`/api/focus/sessions/${done.id}`, { method: "PATCH", body: JSON.stringify({ goalDone: yes }) }).catch(() => {})}
          onBreak={() => (focusTimer.start("break", breakMinutes ?? 5), setDone(null))}
          onMore={() => (focusTimer.start("focus", done.minutes), setDone(null))}
          onClose={() => setDone(null)}
        />
      )}
      {breakOver &&
        createPortal(
          <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 pointer-events-none">
            <div className="sheet-fade pointer-events-auto flex items-center gap-3 rounded-full bg-ink text-bg ps-4 pe-1.5 py-1.5 shadow-xl text-sm font-semibold">
              <span>{t("focus_break_over")}</span>
              <button type="button" className="rounded-full bg-bg/15 px-3 py-1.5 hover:bg-bg/25" onClick={() => (unlockFocusAudio(), focusTimer.start("focus", prefs?.focusMinutes ?? 25), setBreakOver(false))}>
                {t("focus_go")}
              </button>
              <Link href="/pause" className="rounded-full px-2 py-1.5 hover:bg-bg/15" onClick={() => setBreakOver(false)}>
                ☕
              </Link>
              <button type="button" className="grid place-items-center w-8 h-8 rounded-full hover:bg-bg/15" onClick={() => setBreakOver(false)} aria-label={t("close")}>
                <IconX size={14} />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
