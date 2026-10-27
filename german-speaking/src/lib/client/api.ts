"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type Settings } from "../settings";
import type { Stats } from "../stats";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new ApiError(0, "offline", "Network error");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
    throw new ApiError(res.status, body?.error?.code ?? "http_error", body?.error?.message ?? res.statusText);
  }
  return (await res.json()) as T;
}

/** POST and read a newline-delimited JSON stream, calling onEvent for each line. */
export async function streamNdjson<E>(url: string, body: unknown, onEvent: (e: E) => void, signal?: AbortSignal) {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "offline", "Network error");
  }
  if (!res.ok || !res.body) throw new ApiError(res.status, "http_error", res.statusText);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as E);
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf) as E);
}

export interface ServerProviders {
  llm: "anthropic" | "mock";
  tts: "webspeech" | "openai" | "elevenlabs";
  stt: "webspeech" | "openai";
  storage?: "remote" | "file" | "temporary";
}

export function useProviders() {
  const [p, setP] = useState<ServerProviders | null>(null);
  useEffect(() => {
    api<ServerProviders>("/api/config").then(setP, () => setP({ llm: "mock", tts: "webspeech", stt: "webspeech" }));
  }, []);
  return p;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    api<Settings>("/api/settings").then(setSettings, () => setSettings(DEFAULT_SETTINGS));
  }, []);
  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    const saved = await api<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(patch) });
    setSettings(saved);
    return saved;
  }, []);
  return { settings, update };
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    api<Stats>(`/api/stats?tz=${new Date().getTimezoneOffset()}`).then(setStats, (e: Error) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);
  return { stats, error, reload };
}
