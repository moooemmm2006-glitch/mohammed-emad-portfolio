"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { fill, localeOf, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";
import { levelPath, topicPath } from "@/lib/paths";
import { addDays, currentIndex, paceInTopics, PLAN_STEPS, topicDays, topicDone, type PlanDuration, type PlanState, type PlanStepId } from "@/lib/planShared";
import { TopicTitle, useLevelTopics } from "../level/shared";

// 🗺️ The level plan page: the level's topics as a timeline, each one a 2-day cycle of six steps that
// open the right place on the site.

export interface PlanData {
  level: Level;
  topics: number[];
  start: string | null;
  state: PlanState;
  duration: PlanDuration;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function usePlan(level: Level) {
  const [data, setData] = useState<PlanData | null>(null);
  const reload = useCallback(() => api<PlanData>(`/api/plan?level=${level}`).then(setData, () => {}), [level]);
  useEffect(() => void reload(), [reload]);
  return { data, setData, reload };
}

/** Where a step takes you. */
export function stepHref(level: Level, topic: number, step: PlanStepId): string {
  const s = PLAN_STEPS.find((x) => x.id === step)!;
  return s.tab ? topicPath(level, topic, s.tab) : levelPath(level, `?skill=write&topic=${topic}`);
}

export function LevelPlan({ level }: { level: Level }) {
  const { t, lang } = useUI();
  const { topics } = useLevelTopics(level);
  const { data, setData, reload } = usePlan(level);
  const [open, setOpen] = useState<number | null>(null);
  const [startDay, setStartDay] = useState(today());
  const [editStart, setEditStart] = useState(false);
  const accent = LEVEL_CONFIG[level].accent;

  if (!data || !topics) return <p className="py-16 text-center text-muted">{t("loading")}</p>;
  const { duration, state, start } = data;
  const order = data.topics;
  const current = currentIndex(state, order);
  const doneCount = order.filter((n) => topicDone(state, n)).length;
  const fmt = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(localeOf(lang), { weekday: "short", day: "numeric", month: "short" });
  const shown = open ?? (current >= 0 ? order[current] : null);
  const pace = start ? paceInTopics(state, order, start, today()) : 0;

  const tick = async (topic: number, step: PlanStepId, done: boolean) => {
    setData((d) => (d ? { ...d, state: { ...d.state, [topic]: { ...d.state[topic], [step]: { ...d.state[topic]?.[step], done } } } } : d));
    await api("/api/plan", { method: "POST", body: JSON.stringify({ action: "step", topic, step, done }) }).catch(() => reload());
  };
  const saveStart = async (day: string | null) => {
    await api("/api/plan", { method: "POST", body: JSON.stringify({ action: "start", level, day }) }).catch(() => {});
    setEditStart(false);
    await reload();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6" style={{ ["--level-c" as string]: accent }}>
      <Link href={levelPath(level)} className="chip min-h-[40px] w-fit">
        ← {t("plan_back")}
      </Link>

      {/* the plan at a glance */}
      <header className="card depth p-5 sm:p-7 space-y-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">{fill(t("plan_title"), { level })}</h1>
          <p className="text-muted mt-2 leading-relaxed max-w-3xl">{t("plan_sub")}</p>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["📚", fill(t("plan_topics"), { n: duration.topics })],
            ["🗓️", fill(t("plan_study_days"), { n: duration.studyDays })],
            ["🛟", fill(t("plan_buffer_days"), { n: duration.bufferDays })],
            ["🏁", t("plan_review_days")],
          ].map(([icon, label]) => (
            <li key={label} className="rounded-2xl bg-surface-2/70 p-3 text-sm font-semibold">
              <span aria-hidden="true" className="me-1">
                {icon}
              </span>
              {label}
            </li>
          ))}
        </ul>
        <p className="font-bold text-lg" style={{ color: accent }}>
          {fill(t("plan_total"), { w: duration.weeks, d: duration.totalDays })}
        </p>
        <p className="text-sm text-muted">{t("plan_buffer_hint")}</p>

        {/* start date / pace */}
        <div className="rounded-2xl border border-line p-4 space-y-3">
          {start && !editStart ? (
            <>
              <p className="font-semibold">{fill(t("plan_started"), { d: fmt(start), e: fmt(addDays(start, duration.totalDays - 1)) })}</p>
              <p className={`text-sm font-bold ${pace < 0 ? "text-amber-700 dark:text-amber-300" : "text-ok"}`}>
                {pace > 0 ? fill(t("plan_ahead"), { n: pace }) : pace < 0 ? fill(t("plan_behind"), { n: -pace }) : t("plan_on_track")}
              </p>
              <button type="button" className="text-sm text-muted underline underline-offset-4 min-h-[36px]" onClick={() => (setStartDay(start), setEditStart(true))}>
                {t("plan_change_start")}
              </button>
            </>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-semibold">
                <span className="block mb-1">{t("plan_start_q")}</span>
                <input type="date" className="field !w-auto" value={startDay} onChange={(e) => setStartDay(e.target.value)} />
              </label>
              <button type="button" className="btn btn-primary" style={{ background: accent }} disabled={!startDay} onClick={() => void saveStart(startDay)}>
                {t("plan_start")}
              </button>
            </div>
          )}
          <div>
            <p className="text-sm text-muted mb-1">{fill(t("plan_done_count"), { d: doneCount, t: order.length })}</p>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full transition-[width]" style={{ width: `${(100 * doneCount) / order.length}%`, background: accent }} />
            </div>
          </div>
        </div>

        {/* the 2-day cycle */}
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2].map((day) => (
            <div key={day} className="rounded-2xl p-4" style={{ background: `color-mix(in oklab, ${accent} ${day === 1 ? 9 : 5}%, var(--surface))` }}>
              <p className="font-bold mb-2">{fill(t("plan_day"), { n: day })}</p>
              <ol className="space-y-1 text-sm list-decimal ps-5">
                {PLAN_STEPS.filter((s) => s.day === day).map((s) => (
                  <li key={s.id}>{t(`plan_step_${s.id}` as TKey)}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </header>

      {/* the topics */}
      <ol className="relative space-y-3 before:absolute before:top-3 before:bottom-3 before:start-[1.35rem] before:w-0.5 before:bg-line">
        {order.map((n, i) => {
          const tp = topics.find((x) => x.number === n);
          const done = topicDone(state, n);
          const isCurrent = i === current;
          const expanded = shown === n;
          const steps = PLAN_STEPS.filter((s) => state[n]?.[s.id]?.done).length;
          const days = start ? topicDays(start, i) : null;
          return (
            <li key={n} className="relative ps-14" data-plan-topic={n}>
              <span
                className={`absolute start-2 top-3 grid place-items-center w-8 h-8 rounded-full text-sm font-extrabold border-2 ${done ? "text-white" : isCurrent ? "bg-surface" : "bg-surface text-muted"}`}
                style={{ borderColor: done || isCurrent ? accent : "var(--line)", background: done ? accent : undefined, color: isCurrent && !done ? accent : undefined }}
                aria-hidden="true"
              >
                {done ? "✓" : i + 1}
              </span>
              <div className={`card ${isCurrent ? "depth" : ""}`} style={isCurrent ? { borderColor: accent } : undefined}>
                <button type="button" className="w-full text-start p-4 flex flex-wrap items-center gap-x-3 gap-y-1" aria-expanded={expanded} onClick={() => setOpen(expanded ? -1 : n)}>
                  {/* phones: the title gets the whole first line, the date and count go below */}
                  <span className="min-w-0 basis-full sm:basis-0 sm:flex-1">{tp ? <TopicTitle tp={tp} /> : `#${n}`}</span>
                  {isCurrent && (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: accent }}>
                      {t("plan_current")}
                    </span>
                  )}
                  {days && <span className="text-xs text-muted">{fmt(days[0])} – {fmt(days[1])}</span>}
                  <span className="text-xs font-semibold text-muted tabular-nums">{steps}/6</span>
                </button>
                {expanded && <TopicSteps level={level} topic={n} state={state} days={days} onTick={tick} />}
              </div>
            </li>
          );
        })}
        <li className="relative ps-14">
          <span className="absolute start-2 top-3 grid place-items-center w-8 h-8 rounded-full bg-surface border-2 border-line" aria-hidden="true">
            🏁
          </span>
          <div className="card p-4 space-y-2">
            <p className="font-bold">{t("plan_review_title")}</p>
            <p className="text-sm text-muted leading-relaxed">{fill(t("plan_review_text"), { level })}</p>
            <a className="btn btn-ghost !min-h-[40px] text-sm" href="https://www.goethe.de/ins/de/de/prf/exc.html" target="_blank" rel="noopener noreferrer">
              ↗ {t("plan_review_link")}
            </a>
          </div>
        </li>
      </ol>
    </div>
  );
}

function TopicSteps({ level, topic, state, days, onTick }: { level: Level; topic: number; state: PlanState; days: [string, string] | null; onTick: (topic: number, step: PlanStepId, done: boolean) => void }) {
  const { t, lang } = useUI();
  const now = today();
  return (
    <div className="border-t border-line p-4 grid gap-4 md:grid-cols-2">
      {[1, 2].map((day) => (
        <section key={day} className="space-y-3">
          <h3 className="font-bold flex items-center gap-2">
            {fill(t("plan_day"), { n: day })}
            {days && (
              <span className="text-xs font-semibold text-muted">
                {new Date(`${days[day - 1]}T12:00:00`).toLocaleDateString(localeOf(lang), { weekday: "long", day: "numeric", month: "short" })}
                {days[day - 1] === now && <span className="ms-1 rounded-full bg-ok/15 text-ok px-2 py-0.5">{t("plan_today")}</span>}
              </span>
            )}
          </h3>
          <ul className="space-y-2">
            {PLAN_STEPS.filter((s) => s.day === day).map((s) => {
              const st = state[topic]?.[s.id];
              return (
                <li key={s.id} className="rounded-2xl bg-surface-2/60 p-3 space-y-2" data-plan-step={s.id}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={Boolean(st?.done)}
                      aria-label={t(`plan_step_${s.id}` as TKey)}
                      disabled={st?.auto}
                      onClick={() => onTick(topic, s.id, !st?.done)}
                      className={`mt-0.5 grid place-items-center w-7 h-7 shrink-0 rounded-lg border-2 text-sm font-bold ${st?.done ? "text-white border-transparent" : "border-line bg-surface"}`}
                      style={st?.done ? { background: "var(--level-c)" } : undefined}
                    >
                      {st?.done ? "✓" : ""}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold leading-snug ${st?.done ? "line-through decoration-2 opacity-70" : ""}`}>{t(`plan_step_${s.id}` as TKey)}</p>
                      <p className="text-xs text-muted mt-0.5">{st?.auto ? `✓ ${t("plan_auto")}` : t(`plan_step_${s.id}_d` as TKey)}</p>
                    </div>
                    <Link href={stepHref(level, topic, s.id)} className="btn btn-ghost !min-h-[36px] !px-3 text-xs shrink-0">
                      {t("plan_open")} ↗
                    </Link>
                  </div>
                  {s.note && <StepNote topic={topic} step={s.id} initial={st?.note ?? ""} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The learner's own notes on a step (Gemini mistakes, sentences from the video); saved when leaving the box. */
function StepNote({ topic, step, initial }: { topic: number; step: PlanStepId; initial: string }) {
  const { t } = useUI();
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  useEffect(() => setText(initial), [initial]);
  const save = async () => {
    if (text === initial) return;
    await api("/api/plan", { method: "POST", body: JSON.stringify({ action: "step", topic, step, note: text }) })
      .then(() => setSaved(true))
      .catch(() => {});
  };
  return (
    <div>
      <textarea
        className="field min-h-[90px] de text-[15px]"
        dir="auto"
        lang="de"
        value={text}
        maxLength={2000}
        onChange={(e) => (setText(e.target.value), setSaved(false))}
        onBlur={() => void save()}
        placeholder={t(step === "mistakes" ? "plan_note_ph_mistakes" : "plan_note_ph_video")}
      />
      {saved && <p className="text-xs text-ok mt-1">{t("plan_note_saved")}</p>}
    </div>
  );
}
