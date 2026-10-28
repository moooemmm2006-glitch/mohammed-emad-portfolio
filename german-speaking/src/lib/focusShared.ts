// Focus timer (⏱️) and "خزنتي" (my vault): pure logic shared by the browser and the server.
// The timer is stored as an END TIMESTAMP, never as a counter, so it stays exact in background tabs,
// across pages and after a refresh.

export const FOCUS_PRESETS = [15, 25, 45] as const;
export const FOCUS_MIN = 5;
export const FOCUS_MAX = 180;
export const BREAK_CHOICES = [3, 5, 10] as const;

export type FocusPhase = "focus" | "break";

export interface TimerState {
  phase: FocusPhase;
  /** Chosen length in minutes. */
  minutes: number;
  /** When it was started (ms). */
  startedAt: number;
  /** When it ends (ms) — null while paused. */
  endsAt: number | null;
  /** Remaining ms while paused, else null. */
  pausedLeft: number | null;
  goal: string;
}

export const clampMinutes = (m: number) => Math.min(FOCUS_MAX, Math.max(FOCUS_MIN, Math.round(Number.isFinite(m) ? m : 25)));

export function startTimer(phase: FocusPhase, minutes: number, goal = "", now = Date.now()): TimerState {
  const m = phase === "break" ? Math.max(1, Math.round(minutes)) : clampMinutes(minutes);
  return { phase, minutes: m, startedAt: now, endsAt: now + m * 60_000, pausedLeft: null, goal: goal.trim().slice(0, 140) };
}

/** Milliseconds left (never negative). */
export function remainingMs(t: TimerState, now = Date.now()): number {
  if (t.pausedLeft != null) return Math.max(0, t.pausedLeft);
  return Math.max(0, (t.endsAt ?? now) - now);
}

/** 0 → 1, how much of the time has passed. */
export function progressOf(t: TimerState, now = Date.now()): number {
  const total = t.minutes * 60_000;
  return total ? Math.min(1, Math.max(0, 1 - remainingMs(t, now) / total)) : 1;
}

export const isPaused = (t: TimerState) => t.pausedLeft != null;
export const isDone = (t: TimerState, now = Date.now()) => !isPaused(t) && remainingMs(t, now) === 0;

export function pauseTimer(t: TimerState, now = Date.now()): TimerState {
  if (isPaused(t)) return t;
  return { ...t, pausedLeft: remainingMs(t, now), endsAt: null };
}

export function resumeTimer(t: TimerState, now = Date.now()): TimerState {
  if (!isPaused(t)) return t;
  return { ...t, endsAt: now + (t.pausedLeft ?? 0), pausedLeft: null };
}

/** ↺: the same length again from now. */
export const restartTimer = (t: TimerState, now = Date.now()): TimerState => startTimer(t.phase, t.minutes, t.goal, now);

/** "12:30" (or "1:05:00" for long sessions). */
export function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 2, "0");
  return h ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
}

/** A timer read back from localStorage: only a well-formed state is trusted. */
export function parseTimer(raw: unknown): TimerState | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Partial<TimerState>;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  if ((t.phase !== "focus" && t.phase !== "break") || !num(t.minutes) || !num(t.startedAt)) return null;
  if (!(t.endsAt === null || num(t.endsAt)) || !(t.pausedLeft === null || num(t.pausedLeft))) return null;
  if (t.endsAt === null && t.pausedLeft === null) return null;
  return { phase: t.phase, minutes: t.minutes!, startedAt: t.startedAt!, endsAt: t.endsAt ?? null, pausedLeft: t.pausedLeft ?? null, goal: typeof t.goal === "string" ? t.goal.slice(0, 140) : "" };
}

// ---------- the vault: badges and streak ----------

export const BADGES = [
  { id: "h1", minutes: 60, emoji: "🥉" },
  { id: "h5", minutes: 300, emoji: "🥈" },
  { id: "h10", minutes: 600, emoji: "🥇" },
  { id: "h25", minutes: 1500, emoji: "🏅" },
  { id: "h50", minutes: 3000, emoji: "🏆" },
  { id: "h100", minutes: 6000, emoji: "💎" },
] as const;
export type BadgeId = (typeof BADGES)[number]["id"];

export const badgesFor = (totalMinutes: number): BadgeId[] => BADGES.filter((b) => totalMinutes >= b.minutes).map((b) => b.id);

/** Badges reached by this session (were not reached before it). */
export function newBadges(before: number, after: number): BadgeId[] {
  const had = new Set(badgesFor(before));
  return badgesFor(after).filter((b) => !had.has(b));
}

/** Days in a row with focus time, ending today (or yesterday: the streak is still alive). Days are "YYYY-MM-DD". */
export function focusStreak(days: Set<string>, today: string): number {
  const d = new Date(`${today}T00:00:00Z`);
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (days.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

export interface FocusStats {
  totalMinutes: number;
  todayMinutes: number;
  weekMinutes: number;
  streak: number;
  /** The last 7 days, oldest first. */
  last7: { day: string; minutes: number }[];
  badges: BadgeId[];
  sessions: number;
}

/** The motivating lines of the celebration (message keys focus_line_1 … 4). */
export const FOCUS_LINES = 4;
