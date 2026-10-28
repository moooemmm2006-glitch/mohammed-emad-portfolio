"use client";

import { chatPath } from "@/lib/paths";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { unlockSpeech } from "@/lib/client/tts";
import type { Level } from "@/lib/levels";
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
    } catch {
      /* offline: the next save catches up */
    }
  }, []);

  return { items, loaded, save };
}

/** "اتكلم عن اللي شفته": start a conversation with the level partner about the video. */
export function useTalkAboutVideo(level: Level) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const start = useCallback(
    async (video: { kind: "nicos" } | { kind: "videothema"; id: string }) => {
      unlockSpeech(); // the tap is the gesture the browser needs before the partner may speak
      setStarting(true);
      try {
        const d = await api<{ session: { id: string } }>("/api/sessions", { method: "POST", body: JSON.stringify({ level, video }) });
        router.push(chatPath(level, d.session.id, true));
      } catch {
        setStarting(false);
      }
    },
    [level, router],
  );
  return { start, starting };
}
