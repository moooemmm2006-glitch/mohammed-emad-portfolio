// 🗺️ The level plan: every topic of the level is a 2-day cycle that uses what the site offers.
// Day 1: study the topic → talk about it with Gemini → write down the sentences you got wrong.
// Day 2: Easy German video + its sentences → the lesson's grammar → write what you learned and send it to Gemini.
// Pure logic, shared by the browser and the server.

export const PLAN_STEPS = [
  { id: "study", day: 1, tab: "shadow", note: false },
  { id: "gemini", day: 1, tab: "gemini", note: false },
  { id: "mistakes", day: 1, tab: "gemini", note: true },
  { id: "video", day: 2, tab: "hoeren", note: true },
  { id: "grammar", day: 2, tab: "grammar", note: false },
  { id: "write", day: 2, tab: null, note: false },
] as const;
export type PlanStepId = (typeof PLAN_STEPS)[number]["id"];
export const PLAN_STEP_IDS = PLAN_STEPS.map((s) => s.id) as PlanStepId[];
export const isPlanStep = (v: unknown): v is PlanStepId => typeof v === "string" && (PLAN_STEP_IDS as string[]).includes(v);

export const DAYS_PER_TOPIC = 2;
/** Spare days for busy or sick days (a fifth of the study days). */
export const BUFFER_SHARE = 0.2;
/** At the end: one week to review everything and do a model exam. */
export const REVIEW_DAYS = 7;

export interface PlanDuration {
  topics: number;
  studyDays: number;
  bufferDays: number;
  reviewDays: number;
  totalDays: number;
  weeks: number;
}

export function planDuration(topics: number): PlanDuration {
  const studyDays = topics * DAYS_PER_TOPIC;
  const bufferDays = Math.ceil(studyDays * BUFFER_SHARE);
  const totalDays = studyDays + bufferDays + REVIEW_DAYS;
  return { topics, studyDays, bufferDays, reviewDays: REVIEW_DAYS, totalDays, weeks: Math.ceil(totalDays / 7) };
}

/** "YYYY-MM-DD" + n days. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b ("YYYY-MM-DD"). */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** The two days of the topic at position `index` (0-based) when the plan started on `start`. */
export const topicDays = (start: string, index: number): [string, string] => [addDays(start, index * DAYS_PER_TOPIC), addDays(start, index * DAYS_PER_TOPIC + 1)];

/** Which topic (0-based) the calendar says today belongs to, or null before the start / after the last topic. */
export function scheduledIndex(start: string, today: string, topics: number): number | null {
  const d = daysBetween(start, today);
  if (d < 0) return null;
  const i = Math.floor(d / DAYS_PER_TOPIC);
  return i < topics ? i : null;
}

/** Per topic and step: ticked?, a note, and whether the site recorded it by itself (auto). */
export type PlanState = Record<number, Partial<Record<PlanStepId, { done: boolean; note?: string | null; auto?: boolean }>>>;

/** A topic counts as done when all six steps are done. */
export const topicDone = (state: PlanState, topic: number) => PLAN_STEP_IDS.every((s) => state[topic]?.[s]?.done);

/** The first topic (by position) that isn't done yet, or -1 when the whole plan is done. */
export function currentIndex(state: PlanState, topicNumbers: number[]): number {
  return topicNumbers.findIndex((n) => !topicDone(state, n));
}

/**
 * Ahead (+) or behind (−) the calendar, in topics. Positive when you finished more topics than the days
 * so far ask for.
 */
export function paceInTopics(state: PlanState, topicNumbers: number[], start: string, today: string): number {
  const done = topicNumbers.filter((n) => topicDone(state, n)).length;
  const due = Math.min(topicNumbers.length, Math.max(0, Math.floor((daysBetween(start, today) + 1) / DAYS_PER_TOPIC)));
  return done - due;
}
