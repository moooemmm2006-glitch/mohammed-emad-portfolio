"use client";

import { useEffect, useSyncExternalStore } from "react";
import { parseTimer, pauseTimer, restartTimer, resumeTimer, startTimer, type FocusPhase, type TimerState } from "../focusShared";

// The ⏱️ timer for the whole site: one store, kept in localStorage as an end timestamp (so it
// survives refresh and navigation and stays exact in background tabs), synced between tabs.

const KEY = "gs_focus_timer";

let state: TimerState | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function read(): TimerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseTimer(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function write(t: TimerState | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode or blocked storage: the timer still works for this page */
  }
}

function set(t: TimerState | null) {
  state = t;
  write(t);
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = read();
  // Another tab started / stopped the timer.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    state = read();
    listeners.forEach((l) => l());
  });
}

const subscribe = (l: () => void) => {
  ensureLoaded();
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTimer(): TimerState | null {
  return useSyncExternalStore(
    subscribe,
    () => (ensureLoaded(), state),
    () => null,
  );
}

export const focusTimer = {
  get: () => (ensureLoaded(), state),
  start: (phase: FocusPhase, minutes: number, goal = "") => set(startTimer(phase, minutes, goal)),
  pause: () => state && set(pauseTimer(state)),
  resume: () => state && set(resumeTimer(state)),
  restart: () => state && set(restartTimer(state)),
  clear: () => set(null),
  /** Take the finished timer out of the store (only one tab celebrates it). */
  take: (): TimerState | null => {
    const t = read() ?? state;
    set(null);
    return t;
  },
};

// ---------- "an exercise is open": the celebration waits ----------

let busy = 0;
const busyListeners = new Set<() => void>();
export const exerciseOpen = () => busy > 0;
export function onExerciseChange(l: () => void) {
  busyListeners.add(l);
  return () => busyListeners.delete(l);
}

/** Exercises call this while they are running, so the end of the timer never interrupts them. */
export function useExerciseGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    busy++;
    busyListeners.forEach((l) => l());
    return () => {
      busy--;
      busyListeners.forEach((l) => l());
    };
  }, [active]);
}
