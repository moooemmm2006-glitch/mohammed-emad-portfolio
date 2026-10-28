"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
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

export interface ServerProviders {
  llm: "anthropic" | "none";
  tts: "webspeech" | "openai" | "elevenlabs";
  stt: "webspeech" | "openai";
  storage?: "remote" | "file" | "temporary";
}

/** Filled by the root layout on the server, so pages know the providers without waiting for a request. */
export const ProvidersContext = createContext<ServerProviders | null>(null);

export function useProviders() {
  const fromServer = useContext(ProvidersContext);
  const [p, setP] = useState<ServerProviders | null>(fromServer);
  useEffect(() => {
    if (fromServer) return;
    api<ServerProviders>("/api/config").then(setP, () => setP({ llm: "none", tts: "webspeech", stt: "webspeech" }));
  }, [fromServer]);
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
