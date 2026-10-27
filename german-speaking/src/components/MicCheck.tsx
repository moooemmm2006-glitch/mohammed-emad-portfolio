"use client";

import { useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/client/ui";
import { openMicMeter, WebSpeechSTT, webSpeechSupported } from "@/lib/client/stt";
import { Speaker, speakOptionsFor } from "@/lib/client/tts";
import type { Level } from "@/lib/levels";
import type { Settings } from "@/lib/settings";
import { IconMic, IconPlay } from "./Icons";

export function MicCheck({ level, settings, useServerTts, onDone }: { level: Level; settings: Settings; useServerTts: boolean; onDone: () => void }) {
  const { t } = useUI();
  const [heard, setHeard] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [lvl, setLvl] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const speaker = useRef<Speaker | null>(null);
  const closeMeter = useRef<(() => void) | null>(null);

  useEffect(() => {
    speaker.current = new Speaker(() => useServerTts);
    speaker.current.onError = () => setErr(t("err_audio"));
    return () => {
      speaker.current?.stop();
      closeMeter.current?.();
    };
  }, [useServerTts, t]);

  const testSpeaker = () => {
    setErr(null);
    speaker.current?.speakNow("Hallo! Kannst du mich gut hören?", speakOptionsFor(level, settings));
  };

  const testMic = async () => {
    setErr(null);
    setHeard(null);
    try {
      closeMeter.current = await openMicMeter(setLvl);
    } catch {
      setErr(t("err_mic_denied"));
      return;
    }
    if (!webSpeechSupported()) {
      setErr(t("err_no_stt"));
      setTimeout(() => closeMeter.current?.(), 4000);
      return;
    }
    setListening(true);
    const s = new WebSpeechSTT().start(
      {
        onInterim: setHeard,
        onFinal: (r) => setHeard(r.text),
        onError: (c) => setErr(c === "not-allowed" ? t("err_mic_denied") : c === "no-speech" ? t("err_no_speech") : t("err_generic")),
        onEnd: () => {
          setListening(false);
          closeMeter.current?.();
          setLvl(0);
        },
      },
      { autoStopMs: 1500 },
    );
    setTimeout(() => s.stop(), 8000);
  };

  return (
    <div className={`level-${level.toLowerCase()} card p-6 max-w-lg mx-auto space-y-5`}>
      <div>
        <h2 className="text-xl font-bold">{t("mic_title")}</h2>
        <p className="text-muted">{t("mic_body")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="btn btn-ghost" onClick={testSpeaker}>
          <IconPlay /> {t("mic_test_speaker")}
        </button>
        <button className="btn btn-ghost" onClick={testMic} disabled={listening} aria-pressed={listening}>
          <IconMic /> {t("mic_test_mic")}
        </button>
      </div>
      <div className="rounded-xl bg-surface-2 p-4 space-y-3">
        <p className="text-sm">{t("mic_say")}</p>
        <div className="h-2 rounded-full bg-line overflow-hidden" aria-hidden="true">
          <div className="h-full bg-accent transition-[width] duration-75" style={{ width: `${Math.round(lvl * 100)}%` }} />
        </div>
        {heard && (
          <p>
            {t("mic_heard")}: <q className="de font-semibold">{heard}</q>
          </p>
        )}
      </div>
      {err && (
        <p role="alert" className="text-danger text-sm">
          {err}
        </p>
      )}
      <div className="flex gap-3 justify-end">
        <button className="btn btn-ghost" onClick={onDone}>
          {t("mic_skip")}
        </button>
        <button className="btn btn-primary" onClick={onDone}>
          {t("mic_ok")}
        </button>
      </div>
    </div>
  );
}
