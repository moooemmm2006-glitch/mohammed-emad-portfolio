"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ServerProviders } from "@/lib/client/api";
import { ServerTurn, serverRecordingSupported, WebSpeechTurn, webSpeechSupported, type STTErrorCode, type TurnProvider, type TurnSession } from "@/lib/client/stt";
import { loadVoices, Speaker, speakOptionsFor } from "@/lib/client/tts";
import type { Level } from "@/lib/levels";
import type { Settings } from "@/lib/settings";

// The level's voice and the microphone for book practice (providers and voices from the settings).

export type VoicePhase = "idle" | "speaking" | "listening";

export function useVoice(level: Level, settings: Settings, providers: ServerProviders) {
  const useServerTts = settings.ttsProvider === "server" || (settings.ttsProvider === "auto" && providers.tts !== "webspeech");
  const provider: TurnProvider | null = useMemo(() => {
    const wantServer = settings.sttProvider === "server" || (settings.sttProvider === "auto" && providers.stt === "openai");
    if (wantServer && serverRecordingSupported()) return new ServerTurn();
    if (webSpeechSupported()) return new WebSpeechTurn();
    if (providers.stt === "openai" && serverRecordingSupported()) return new ServerTurn();
    return null;
  }, [settings.sttProvider, providers.stt]);

  const speaker = useRef<Speaker | null>(null);
  const turn = useRef<TurnSession | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [live, setLive] = useState("");
  const [audioError, setAudioError] = useState(false);
  const [micError, setMicError] = useState<STTErrorCode | null>(null);

  useEffect(() => {
    const s = new Speaker(() => useServerTts);
    s.onError = () => setAudioError(true);
    speaker.current = s;
    void loadVoices();
    return () => s.stop();
  }, [useServerTts]);

  useEffect(() => () => turn.current?.abort(), []);

  /** Speak German text and resolve when it has been read out. */
  const say = useCallback(
    async (text: string) => {
      const s = speaker.current;
      if (!s) return;
      turn.current?.abort();
      setAudioError(false);
      setPhase("speaking");
      s.speakNow(text, () => speakOptionsFor(level, settingsRef.current));
      await s.whenIdle();
      setPhase((p) => (p === "speaking" ? "idle" : p));
    },
    [level],
  );

  /** Listen to one sentence; resolves with what was heard ("" when nothing was said). */
  const listen = useCallback(
    (maxIdleMs = 10000) =>
      new Promise<string>((resolve) => {
        if (!provider) {
          setMicError("unsupported");
          return resolve("");
        }
        speaker.current?.stop();
        turn.current?.abort();
        setMicError(null);
        setLive("");
        setPhase("listening");
        let heard = "";
        // A single sentence: stop listening after a shorter pause than the setting allows.
        const silenceMs = Math.min(settingsRef.current.silenceMs, 2200);
        turn.current = provider.start(
          {
            onTranscript: setLive,
            onFinal: (r) => (heard = r.text),
            onError: (code) => setMicError(code),
            onEnd: () => {
              turn.current = null;
              setPhase("idle");
              setLive("");
              resolve(heard);
            },
          },
          { silenceMs, maxIdleMs },
        );
      }),
    [provider],
  );

  const stop = useCallback(() => {
    speaker.current?.stop();
    turn.current?.abort();
    setPhase("idle");
  }, []);

  /** "I'm done" while listening. */
  const finish = useCallback(() => turn.current?.finish(), []);

  return useMemo(
    () => ({ say, listen, stop, finish, phase, live, audioError, micError, hasMic: !!provider }),
    [say, listen, stop, finish, phase, live, audioError, micError, provider],
  );
}
