"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, streamNdjson, type ServerProviders } from "@/lib/client/api";
import type { TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import {
  ServerTurn,
  serverRecordingSupported,
  startBargeInDetector,
  WebSpeechTurn,
  webSpeechSupported,
  type STTErrorCode,
  type TurnProvider,
  type TurnSession,
} from "@/lib/client/stt";
import type { TurnResult } from "@/lib/client/transcript";
import { Speaker, speakOptionsFor, webSpeechMaxSpeed } from "@/lib/client/tts";
import type { Hint, TurnEvent } from "@/lib/conversation";
import { LEVEL_CONFIG, tagLabel, type Level } from "@/lib/levels";
import { SPEEDS, type Settings } from "@/lib/settings";
import { Avatar } from "./Avatar";
import { IconEye, IconEyeOff, IconHelp, IconMic, IconRepeat, IconStop, IconX } from "./Icons";

export interface UITurn {
  key: string;
  role: "user" | "partner";
  text: string;
  confidence?: number | null;
  pending?: boolean;
  revealed?: boolean;
}

type LockStatus = "generating" | "checking" | "retrying" | "fallback";

interface Props {
  level: Level;
  sessionId: string;
  initialTurns: UITurn[];
  greet: boolean;
  resumed: boolean;
  focusTag: string | null;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => Promise<unknown>;
  providers: ServerProviders;
}

// Shown inside the big button while it waits for the learner.
export const MOTIVATION = ["Sprich einfach!", "Weiter so!", "Du schaffst das!", "Los geht's!", "Mach weiter!", "Trau dich!", "Super, weiter!"];

const STT_ERR: Record<STTErrorCode, TKey> = {
  "not-allowed": "err_mic_denied",
  "audio-capture": "err_mic_denied",
  network: "err_offline",
  unsupported: "err_no_stt",
  server: "err_api",
};

const DEV = process.env.NODE_ENV !== "production";

let keySeq = 0;
const nextKey = () => `t${Date.now()}-${keySeq++}`;

export function Conversation(p: Props) {
  const { level, sessionId, settings, providers } = p;
  const { t, lang } = useUI();
  const router = useRouter();
  const cfg = LEVEL_CONFIG[level];

  const [turns, setTurns] = useState<UITurn[]>(p.initialTurns);
  const [busy, setBusy] = useState(false);
  const [lockStatus, setLockStatus] = useState<LockStatus | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState("");
  const [ring, setRing] = useState(0);
  const [error, setError] = useState<TKey | null>(null);
  const [audioWarn, setAudioWarn] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [showText, setShowText] = useState(settings.showPartnerText);
  const [autoTurn, setAutoTurn] = useState(settings.autoTurn);
  const [speed, setSpeed] = useState<number>(settings.speeds?.[level] ?? 1);
  const [maxSpeed, setMaxSpeed] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);
  const [offline, setOffline] = useState(false);
  const [phrase, setPhrase] = useState(() => Math.floor(Math.random() * MOTIVATION.length));

  const speaker = useRef<Speaker | null>(null);
  const session = useRef<TurnSession | null>(null);
  const stopBarge = useRef<(() => void) | null>(null);
  const lastActivity = useRef<number | null>(null);
  const turnEndedAt = useRef<number | null>(null);
  const lastPartner = useRef<string>([...p.initialTurns].reverse().find((x) => x.role === "partner")?.text ?? "");
  const endedRef = useRef(false);
  const busyRef = useRef(false);
  const autoTurnRef = useRef(autoTurn);
  const settingsRef = useRef(settings);
  const speedRef = useRef(speed);
  const listRef = useRef<HTMLDivElement>(null);
  autoTurnRef.current = autoTurn;
  settingsRef.current = settings;
  speedRef.current = speed;

  const useServerTts = settings.ttsProvider === "server" || (settings.ttsProvider === "auto" && providers.tts !== "webspeech");
  const provider: TurnProvider | null = useMemo(() => {
    const wantServer = settings.sttProvider === "server" || (settings.sttProvider === "auto" && providers.stt === "openai");
    if (wantServer && serverRecordingSupported()) return new ServerTurn();
    if (webSpeechSupported()) return new WebSpeechTurn();
    if (providers.stt === "openai" && serverRecordingSupported()) return new ServerTurn();
    return null;
  }, [settings.sttProvider, providers.stt]);

  // Read at speak time, so a speed change applies from the very next sentence.
  const speakOpts = useCallback(
    (extra = 1) => () => speakOptionsFor(level, { ...settingsRef.current, speeds: { ...settingsRef.current.speeds, [level]: speedRef.current } }, extra),
    [level],
  );

  // ---------- sending a turn ----------
  const sendTurn = useCallback(
    async (text: string | null, meta: { confidence?: number | null; alternatives?: string[]; input?: "voice" | "text" } = {}) => {
      if (busyRef.current || endedRef.current) return;
      if (!navigator.onLine) {
        setError("err_offline");
        return;
      }
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setCanRetry(false);
      setHint(null);
      if (text) setPhrase((i) => (i + 1) % MOTIVATION.length);
      const partnerKey = nextKey();
      lastPartner.current = "";
      setTurns((ts) => [
        ...ts,
        ...(text ? [{ key: nextKey(), role: "user" as const, text, confidence: meta.confidence }] : []),
        { key: partnerKey, role: "partner", text: "", pending: true },
      ]);
      let finalText = "";
      let failed = false;
      try {
        await streamNdjson<TurnEvent>(`/api/sessions/${sessionId}/turn`, { text: text ?? undefined, ...meta }, (e) => {
          if (e.type === "status") setLockStatus(e.value === "listening" ? null : e.value);
          else if (e.type === "sentence") {
            lastPartner.current = lastPartner.current ? `${lastPartner.current} ${e.text}` : e.text;
            setTurns((ts) => ts.map((x) => (x.key === partnerKey ? { ...x, text: x.text ? `${x.text} ${e.text}` : e.text } : x)));
            speaker.current?.enqueue(e.text, speakOpts());
          } else if (e.type === "done") {
            finalText = e.text;
            lastPartner.current = e.text;
            setTurns((ts) => ts.map((x) => (x.key === partnerKey ? { ...x, text: e.text, pending: false } : x)));
            // The reply is complete; saving happens on the server in the background.
            busyRef.current = false;
            setBusy(false);
            setLockStatus(null);
          } else if (e.type === "error") {
            failed = true;
          }
        });
      } catch (err) {
        failed = true;
        if (err instanceof ApiError && err.code === "offline") setOffline(true);
      }
      busyRef.current = false;
      setBusy(false);
      setLockStatus(null);
      if (failed || !finalText) {
        setTurns((ts) => ts.filter((x) => x.key !== partnerKey));
        setError(navigator.onLine ? "err_api" : "err_offline");
        setCanRetry(true);
      }
    },
    [sessionId, speakOpts],
  );

  // ---------- listening (one whole turn, through pauses) ----------
  const startListening = useCallback(
    (seed?: string) => {
      if (endedRef.current || busyRef.current || session.current) return;
      if (!provider) {
        setError("err_no_stt");
        return;
      }
      stopBarge.current?.();
      stopBarge.current = null;
      speaker.current?.stop();
      setError(null);
      setListening(true);
      setLive(seed ?? "");
      lastActivity.current = seed ? performance.now() : null;
      session.current = provider.start(
        {
          onTranscript: setLive,
          onActivity: (at) => (lastActivity.current = at),
          onFinal: (r: TurnResult) => {
            turnEndedAt.current = performance.now();
            void sendTurn(r.text, { confidence: r.confidence, alternatives: r.alternatives, input: "voice" });
          },
          onError: (code) => setError(STT_ERR[code]),
          onEnd: () => {
            session.current = null;
            lastActivity.current = null;
            setListening(false);
            setLive("");
            setRing(0);
          },
        },
        { silenceMs: settingsRef.current.silenceMs, maxIdleMs: 45000, seed },
      );
    },
    [provider, sendTurn],
  );
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  // The thin ring fills during silence, so the learner sees when the turn is about to be sent.
  useEffect(() => {
    if (!listening) return;
    let raf = 0;
    const tick = () => {
      const last = lastActivity.current;
      const v = last === null ? 0 : Math.min(1, (performance.now() - last) / settingsRef.current.silenceMs);
      setRing((r) => (Math.abs(r - v) > 0.01 ? v : r));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening]);

  // ---------- speaker + barge-in ----------
  useEffect(() => {
    const s = new Speaker(() => useServerTts);
    speaker.current = s;
    s.onError = () => setAudioWarn(true);
    s.onSentenceStart = () => {
      if (turnEndedAt.current !== null) {
        if (DEV) console.info(`[latency] end of turn → first audio: ${Math.round(performance.now() - turnEndedAt.current)} ms`);
        turnEndedAt.current = null;
      }
    };
    s.onState = (state) => {
      setSpeaking(state === "speaking");
      if (state === "speaking" && autoTurnRef.current && settingsRef.current.bargeIn && provider?.id === "webspeech" && !stopBarge.current) {
        // Listen while the partner talks; only real learner speech (not the partner's own voice) interrupts.
        stopBarge.current = startBargeInDetector(
          () => lastPartner.current,
          (heard) => {
            stopBarge.current = null;
            s.stop();
            startListeningRef.current(heard);
          },
        );
      }
      if (state === "idle") {
        stopBarge.current?.();
        stopBarge.current = null;
      }
    };
    return () => s.stop();
  }, [useServerTts, provider]);

  // Hands-free: when the partner has finished, start listening again.
  useEffect(() => {
    if (!autoTurn || busy || speaking || listening || ending || error || hint || !lastPartner.current) return;
    const id = setTimeout(() => startListeningRef.current(), 350);
    return () => clearTimeout(id);
  }, [autoTurn, busy, speaking, listening, ending, error, hint]);

  // ---------- greeting on a new session ----------
  const greeted = useRef(false);
  useEffect(() => {
    if (p.greet && !greeted.current) {
      greeted.current = true;
      void sendTurn(null);
    }
  }, [p.greet, sendTurn]);

  // ---------- speed: show the real maximum of the browser voice ----------
  useEffect(() => {
    if (useServerTts) return setMaxSpeed(null);
    void webSpeechMaxSpeed(level, settings).then(setMaxSpeed);
  }, [level, settings, useServerTts]);

  // ---------- autosave / tab close ----------
  useEffect(() => {
    const onHide = () => {
      if (!endedRef.current) navigator.sendBeacon?.(`/api/sessions/${sessionId}/end`);
    };
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      session.current?.abort();
      stopBarge.current?.();
      if (!endedRef.current) void fetch(`/api/sessions/${sessionId}/end`, { method: "POST", keepalive: true }).catch(() => {});
    };
  }, [sessionId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, live, hint]);

  // ---------- actions ----------
  const endConversation = async () => {
    endedRef.current = true;
    setEnding(true);
    speaker.current?.stop();
    session.current?.abort();
    stopBarge.current?.();
    const hasUserTurns = turns.some((x) => x.role === "user");
    await fetch(`/api/sessions/${sessionId}/end`, { method: "POST" }).catch(() => {});
    router.push(hasUserTurns ? `/reports/${sessionId}?generate=1` : `/speak`);
  };

  const askHint = async () => {
    session.current?.abort();
    setHintLoading(true);
    try {
      setHint(await api<Hint>(`/api/sessions/${sessionId}/hint`, { method: "POST" }));
    } catch {
      setError("err_api");
    } finally {
      setHintLoading(false);
    }
  };

  const toggleShowText = () => {
    setShowText((v) => !v);
    void p.updateSettings({ showPartnerText: !showText });
  };
  const toggleAutoTurn = () => {
    const v = !autoTurn;
    setAutoTurn(v);
    void p.updateSettings({ autoTurn: v });
    if (!v) stopBarge.current?.();
  };
  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    const next = SPEEDS[(i + 1) % SPEEDS.length];
    setSpeed(next);
    speedRef.current = next;
    void p.updateSettings({ speeds: { ...settings.speeds, [level]: next } });
  };

  // One big button: tap = start talking; while talking tap = "I'm done, send now";
  // while the partner talks tap = interrupt and talk.
  const onMain = () => {
    if (listening) session.current?.finish();
    else if (busy) return;
    else {
      setError(null);
      startListening();
    }
  };

  const phase: "listening" | "speaking" | "thinking" | "idle" = listening ? "listening" : speaking ? "speaking" : busy ? "thinking" : "idle";
  const statusKey: TKey =
    phase === "listening"
      ? "conv_state_listening"
      : phase === "speaking"
        ? "conv_state_speaking"
        : phase === "thinking"
          ? lockStatus === "checking"
            ? "conv_state_checking"
            : lockStatus === "retrying" || lockStatus === "fallback"
              ? "conv_state_retrying"
              : "conv_state_thinking"
          : "conv_state_idle";
  const buttonText =
    phase === "listening" ? "Ich höre zu…" : phase === "thinking" ? "Moment…" : phase === "speaking" ? "Hör gut zu!" : MOTIVATION[phrase];
  const buttonAria: TKey =
    phase === "listening" ? "conv_aria_done" : phase === "speaking" ? "conv_aria_barge" : phase === "thinking" ? "conv_aria_wait" : "conv_aria_start";
  const caption: string =
    phase === "listening"
      ? t("conv_listening_help").replace("{s}", String(Math.round(settings.silenceMs / 100) / 10))
      : phase === "speaking"
        ? t("conv_speaking_help")
        : autoTurn
          ? t("conv_handsfree_on")
          : t("conv_tap_to_start");

  const partnerName = level === "B2" ? "Dr. Tobias Wendt" : cfg.persona.name;
  const RING_R = 47;
  const RING_C = 2 * Math.PI * RING_R;
  const capped = maxSpeed !== null && speed > maxSpeed;

  return (
    <div className={`level-${level.toLowerCase()} flex flex-col h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-8.5rem)] max-w-3xl mx-auto`}>
      {/* top bar */}
      <div className="flex items-center gap-3 pb-3 border-b border-line">
        <Avatar level={level} size={44} />
        <div className="min-w-0">
          <div className="font-bold">
            <span className="de">{partnerName}</span> <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white bg-accent de">{level}</span>
          </div>
          <div className="text-sm text-muted" aria-live="polite">
            {t(statusKey)}
          </div>
        </div>
        <button className="btn btn-ghost ms-auto !border-danger/50 text-danger" onClick={endConversation} disabled={ending}>
          <IconStop size={18} />
          <span>
            {t("conv_end")}
            <span className="hidden sm:inline de text-muted text-xs"> · {t("conv_end_de")}</span>
          </span>
        </button>
      </div>

      {providers.llm === "mock" && <p className="mt-2 rounded-lg bg-gold/10 px-3 py-1.5 text-xs">{t("mock_banner")}</p>}
      {offline && (
        <p role="alert" className="mt-2 rounded-lg bg-danger/10 text-danger px-3 py-1.5 text-sm">
          {t("err_offline")}
        </p>
      )}

      {/* messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto py-4 space-y-3" aria-live="polite" aria-relevant="additions">
        {p.resumed && <p className="text-center text-xs text-muted">{t("conv_resumed")}</p>}
        {p.focusTag && settings.focusSteering && (
          <p className="text-center text-xs text-muted">
            {t("conv_focus")}: <b>{tagLabel(p.focusTag, lang)}</b>
          </p>
        )}
        {turns.map((m) =>
          m.role === "partner" ? (
            <div key={m.key} className="flex gap-2 items-end">
              <Avatar level={level} size={30} className="hidden sm:block" />
              <div className="max-w-[85%] rounded-2xl rounded-es-md bg-surface border border-line px-4 py-2.5 shadow-card">
                {m.pending && !m.text ? (
                  <span className="wave inline-flex items-center h-6" aria-label={t("conv_state_thinking")}>
                    <span />
                    <span />
                    <span />
                  </span>
                ) : showText || m.revealed ? (
                  <p className="de text-[1.05rem]" lang="de">
                    {m.text}
                  </p>
                ) : (
                  <button className="text-start" onClick={() => setTurns((ts) => ts.map((x) => (x.key === m.key ? { ...x, revealed: true } : x)))}>
                    <span className="de blur-text" aria-hidden="true">
                      {m.text}
                    </span>
                    <span className="block text-xs text-muted mt-1">{t("conv_reveal")}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div key={m.key} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-ee-md bg-accent text-white px-4 py-2.5">
                <p className="de" lang="de">
                  {m.text}
                </p>
                {m.confidence != null && m.confidence < 0.6 && <p className="text-[11px] opacity-80 mt-0.5">⚠ {t("conv_low_conf")}</p>}
              </div>
            </div>
          ),
        )}
        {listening && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-ee-md border-2 border-dashed border-accent px-4 py-2.5 text-accent min-w-24">
              <p className="de" lang="de">
                {live || <span className="wave inline-flex items-center h-6" aria-hidden="true"><span /><span /><span /></span>}
              </p>
            </div>
          </div>
        )}
        {hint && (
          <div className="card p-4 space-y-2 border-gold/60" role="region" aria-label={t("conv_stuck")}>
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-gold">{t("conv_stuck")} 🙂</h3>
              <button className="btn btn-ghost !min-h-[32px] !px-2" onClick={() => setHint(null)} aria-label={t("conv_hint_close")}>
                <IconX size={16} />
              </button>
            </div>
            <p>
              <b>{t("conv_hint_meaning")}:</b> <span dir="auto">{hint.meaning}</span>
            </p>
            <p>
              <b>{t("conv_hint_tip")}:</b> <span dir="auto">{hint.hint}</span>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <b>{t("conv_hint_simpler")}:</b>
              <span className="de" lang="de">
                {hint.rephrase}
              </span>
              <button className="btn btn-ghost !min-h-[30px] !py-0 !px-2 text-xs" onClick={() => speaker.current?.speakNow(hint.rephrase, speakOpts())} aria-label={t("conv_repeat")}>
                <IconRepeat size={14} />
              </button>
            </p>
            <p>
              <b>{t("conv_hint_starter")}:</b>{" "}
              <span className="de" lang="de">
                {hint.starter}
              </span>
            </p>
            <button className="btn btn-primary !min-h-[36px] !py-1 text-sm" onClick={() => setHint(null)}>
              {t("conv_hint_close")}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-2 rounded-xl bg-danger/10 text-danger px-4 py-2 text-sm flex items-center gap-3">
          <span className="flex-1">{t(error)}</span>
          {canRetry && (
            <button className="btn btn-ghost !min-h-[32px] !py-1 text-sm" onClick={() => void sendTurn(null)}>
              {t("conv_retry")}
            </button>
          )}
        </div>
      )}
      {audioWarn && !error && <p className="mb-2 text-center text-xs text-muted">{t("err_audio")}</p>}

      {/* dock */}
      <div className="border-t border-line pt-3 space-y-3">
        <div className="flex sm:flex-wrap sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          <ToolButton onClick={() => speaker.current?.speakNow(lastPartner.current, speakOpts())} disabled={!lastPartner.current || busy} icon={<IconRepeat size={18} />} label={t("conv_repeat")} />
          <button
            className="chip shrink-0 whitespace-nowrap hover:bg-surface-2 min-h-[40px] tabular-nums"
            onClick={cycleSpeed}
            aria-label={`${t("conv_speed")}: ${speed}×`}
            title={capped ? `${t("conv_speed_max")}: ${maxSpeed}×` : undefined}
          >
            <span className="text-xs sm:text-sm">{t("conv_speed")}</span>
            <b className="de text-sm">{speed}×</b>
            {capped && <span className="text-[10px] text-muted de">(max {maxSpeed}×)</span>}
          </button>
          <ToolButton onClick={askHint} disabled={!lastPartner.current || hintLoading || busy} icon={<IconHelp size={18} />} label={hintLoading ? t("loading") : t("conv_stuck")} />
          <ToolButton
            onClick={toggleShowText}
            pressed={!showText}
            icon={showText ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            label={showText ? t("conv_hide_text") : t("conv_show_text")}
          />
          <ToolButton onClick={toggleAutoTurn} pressed={autoTurn} icon={<IconMic size={18} />} label={t("conv_autoturn")} />
        </div>

        {provider ? (
          <div className="flex flex-col items-center gap-2 pb-1">
            <div className="relative w-36 h-36 sm:w-40 sm:h-40 grid place-items-center">
              {/* silence ring: fills while you are quiet; full = your turn is sent */}
              <svg className="absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--line)" strokeWidth="2" opacity={listening ? 1 : 0} />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - ring)}
                  opacity={listening ? 1 : 0}
                />
              </svg>
              <div className="orb !w-[7.25rem] !h-[7.25rem] sm:!w-[8.25rem] sm:!h-[8.25rem]" data-state={phase} style={{ ["--lvl" as string]: listening ? 0.35 : 0 }}>
                <button
                  className="relative z-10 grid place-items-center w-full h-full rounded-full text-white select-none px-3 disabled:cursor-wait"
                  onClick={onMain}
                  disabled={ending || phase === "thinking"}
                  aria-pressed={listening}
                  aria-label={t(buttonAria)}
                >
                  <span className="de font-extrabold text-[1.05rem] sm:text-lg leading-tight text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" lang="de">
                    {buttonText}
                  </span>
                </button>
              </div>
            </div>
            <p className="text-xs text-muted text-center max-w-xs">{caption}</p>
          </div>
        ) : (
          <p role="alert" className="rounded-xl bg-danger/10 text-danger px-4 py-3 text-sm text-center">
            {t("err_no_stt")}
          </p>
        )}
      </div>
    </div>
  );
}

function ToolButton({ onClick, icon, label, disabled, pressed }: { onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean; pressed?: boolean }) {
  return (
    <button className="chip shrink-0 whitespace-nowrap hover:bg-surface-2 disabled:opacity-40 min-h-[40px]" onClick={onClick} disabled={disabled} aria-pressed={pressed}>
      {icon}
      <span className="text-xs sm:text-sm">{label}</span>
    </button>
  );
}
