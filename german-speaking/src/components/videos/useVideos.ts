"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import type { VideoState } from "@/lib/videoShared";

/** The learner's video progress, with a throttled save. */
export function useVideoProgress() {
  const [items, setItems] = useState<Record<string, VideoState>>({});
  const [loaded, setLoaded] = useState(false);
  const lastSave = useRef<Record<string, number>>({});

  useEffect(() => {
    api<{ items: VideoState[] }>("/api/videos/progress").then(
      (d) => {
        setItems(Object.fromEntries(d.items.map((x) => [x.key, x])));
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, []);

  const save = useCallback(async (key: string, p: { position?: number; duration?: number | null; watched?: boolean }) => {
    // Position updates at most every 10 s per video; "watched" always goes through.
    const now = Date.now();
    if (p.watched === undefined && now - (lastSave.current[key] ?? 0) < 10_000) return;
    lastSave.current[key] = now;
    try {
      const saved = await api<VideoState>("/api/videos/progress", { method: "POST", body: JSON.stringify({ key, ...p }) });
      setItems((s) => ({ ...s, [key]: saved }));
      if (p.watched !== undefined || saved.watched) window.dispatchEvent(new Event("gs:video-progress"));
    } catch {
      /* offline: the next save catches up */
    }
  }, []);

  return { items, loaded, save };
}
