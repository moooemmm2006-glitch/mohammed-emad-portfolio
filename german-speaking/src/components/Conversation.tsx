"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, streamNdjson, type ServerProviders } from "@/lib/client/api";
import type { TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import {
  looksLikeEcho,
  openMicMeter,
  ServerSTT,
  serverRecordingSupported,
  WebSpeechSTT,
  webSpeechSupported,
  type STTErrorCode,
  type STTProvider,
  type STTResult,
  type STTSession,
} from "@/lib/client/stt";
import { Speaker, speakOptionsFor } from "@/lib/client/tts";
import type { Hint, TurnEvent } from "@/lib/conversation";
import { LEVEL_CONFIG, tagLabel, type Level } from "@/lib/levels";
import type { Settings } from "@/lib/settings";
import { Avatar } from "./Avatar";
import { IconEye, IconEyeOff, IconHelp, IconMic, IconRepeat, IconSend, IconSlow, IconStop, IconX } from "./Icons";

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

const STT_ERR: Partial<Record<STTErrorCode, TKey>> = {
  "not-allowed": "err_mic_denied",
  "audio-capture": "err_mic_denied",
  "no-speech": "err_no_speech",
  network: "err_offline",
  unsupported: "err_no_stt",
  server: "err_api",
};

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
  const [interim, setInterim] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<TKey | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [showText, setShowText] = useState(settings.showPartnerText);
  const [autoTurn, setAutoTurn] = useState(settings.autoTurn);
  const [ending, setEnding] = useState(false);
  const [offline, setOffline] = useState(false);

  const speaker = useRef<Speaker | null>(null);
  const stt = useRef<STTSession | null>(null);
  const bargeSession = useRef<STTSession | null>(null);
  const meterClose = useRef<(() => void) | null>(null);
  const lastPartner = useRef<string>([...p.initialTurns].reverse().find((x) => x.role === "partner")?.text ?? "");
  const pressStart = useRef(0);
  const endedRef = useRef(false);
  const autoTurnRef = useRef(autoTurn);
  const busyRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  autoTurnRef.current = autoTurn;

  const useServerTts = settings.ttsProvider === "server" || (settings.ttsProvider === "auto" && providers.tts !== "webspeech");
  const sttProvider: STTProvider | null = (() => {
    const wantServer = settings.sttProvider === "server" || (settings.sttProvider === "auto" && providers.stt === "openai");
    if (wantServer && serverRecordingSupported()) return new ServerSTT();
    if (webSpeechSupported()) return new WebSpeechSTT();
    if (providers.stt === "openai" && serverRecordingSupported()) return new ServerSTT();
    return null;
  })();
  const sttRef = useRef(sttProvider);
  sttRef.current = sttProvider;

  const opts = useCallback((extra = 1) => speakOptionsFor(level, settings, extra), [level, settings]);

  // ---------- mic meter for the orb ----------
  const openMeter = useCallback(async () => {
    if (meterClose.current) return;
    try {
      meterClose.current = await openMicMeter(setMicLevel);
    } catch {
      /* the recogniser reports permission errors itself */
    }
  }, []);
  const closeMeter = useCallback(() => {
    meterClose.current?.();
    meterClose.current = null;
    setMicLevel(0);
  }, []);

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
      const partnerKey = nextKey();
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
            setTurns((ts) => ts.map((x) => (x.key === partnerKey ? { ...x, text: x.text ? `${x.text} ${e.text}` : e.text } : x)));
            speaker.current?.enqueue(e.text, opts());
          } else if (e.type === "done") {
            finalText = e.text;
            setTurns((ts) => ts.map((x) => (x.key === partnerKey ? { ...x, text: e.text, pending: false } : x)));
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
        return;
      }
      lastPartner.current = finalText;
    },
    [sessionId, opts],
  );

  // ---------- listening ----------
  const startListening = useCallback(() => {
    if (endedRef.current || busyRef.current) return;
    const provider = sttRef.current;
    if (!provider) {
      setError("err_no_stt");
      return;
    }
    speaker.current?.stop(); // barge-in by button
    bargeSession.current?.abort();
    bargeSession.current = null;
    setError(null);
    setInterim("");
    setListening(true);
    void openMeter();
    stt.current = provider.start(
      {
        onInterim: setInterim,
        onFinal: (r: STTResult) => void sendTurn(r.text, { confidence: r.confidence, alternatives: r.alternatives, input: "voice" }),
        onError: (code) => {
          const k = STT_ERR[code];
          if (k) setError(k);
        },
        onEnd: () => {
          stt.current = null;
          setListening(false);
          setInterim("");
          closeMeter();
        },
      },
      { autoStopMs: autoTurnRef.current ? 1400 : undefined },
    );
  }, [openMeter, closeMeter, sendTurn]);

  const stopListening = useCallback(() => stt.current?.stop(), []);

  // ---------- speaker + barge-in ----------
  // Refs keep the speaker alive across settings changes (recreating it would cut speech off).
  const sendTurnRef = useRef(sendTurn);
  sendTurnRef.current = sendTurn;
  const bargeInRef = useRef(settings.bargeIn);
  bargeInRef.current = settings.bargeIn;

  useEffect(() => {
    const s = new Speaker(() => useServerTts);
    speaker.current = s;
    s.onError = () => setError("err_audio");
    s.onState = (state) => {
      setSpeaking(state === "speaking");
      if (state === "speaking" && autoTurnRef.current && bargeInRef.current && webSpeechSupported() && !bargeSession.current) {
        // Listen while the partner talks; real speech (not our own voice echoing) stops the partner.
        let triggered = false;
        bargeSession.current = new WebSpeechSTT().start(
          {
            onInterim: (txt) => {
              if (triggered || txt.trim().length < 3 || looksLikeEcho(txt, lastPartner.current)) return;
              triggered = true;
              s.stop();
              stt.current = bargeSession.current;
              bargeSession.current = null;
              setListening(true);
              setInterim(txt);
              void openMeter();
            },
            onFinal: (r) => {
              if (triggered) void sendTurnRef.current(r.text, { confidence: r.confidence, alternatives: r.alternatives, input: "voice" });
            },
            onEnd: () => {
              if (triggered) {
                stt.current = null;
                setListening(false);
                setInterim("");
                closeMeter();
              } else if (bargeSession.current) {
                bargeSession.current = null;
              }
            },
          },
          { autoStopMs: 1400 },
        );
      }
      if (state === "idle") {
        bargeSession.current?.abort();
        bargeSession.current = null;
      }
    };
    return () => s.stop();
  }, [useServerTts, openMeter, closeMeter]);

  // Hands-free: after the partner has finished speaking, listen again automatically.
  useEffect(() => {
    if (!autoTurn || busy || speaking || listening || ending || error || !lastPartner.current) return;
    const id = setTimeout(() => startListening(), 350);
    return () => clearTimeout(id);
  }, [autoTurn, busy, speaking, listening, ending, error, startListening]);

  // ---------- greeting on a new session ----------
  const greeted = useRef(false);
  useEffect(() => {
    if (p.greet && !greeted.current) {
      greeted.current = true;
      void sendTurn(null);
    }
  }, [p.greet, sendTurn]);

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
      stt.current?.abort();
      bargeSession.current?.abort();
      meterClose.current?.();
      if (!endedRef.current) void fetch(`/api/sessions/${sessionId}/end`, { method: "POST", keepalive: true }).catch(() => {});
    };
  }, [sessionId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, interim, hint]);

  // ---------- actions ----------
  const endConversation = async () => {
    endedRef.current = true;
    setEnding(true);
    speaker.current?.stop();
    stt.current?.abort();
    bargeSession.current?.abort();
    closeMeter();
    const hasUserTurns = turns.some((x) => x.role === "user");
    await fetch(`/api/sessions/${sessionId}/end`, { method: "POST" }).catch(() => {});
    router.push(hasUserTurns ? `/reports/${sessionId}?generate=1` : `/speak`);
  };

  const askHint = async () => {
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
    if (!v) {
      stt.current?.abort();
      bargeSession.current?.abort();
    }
  };

  const submitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const v = typed.trim();
    if (!v) return;
    setTyped("");
    stt.current?.abort();
    speaker.current?.stop();
    void sendTurn(v, { input: "text" });
  };

  // Mic button: quick tap toggles, press-and-hold is push-to-talk.
  const onMicDown = () => {
    pressStart.current = Date.now();
    if (listening) stopListening();
    else startListening();
  };
  const onMicUp = () => {
    if (listening && Date.now() - pressStart.current > 400) stopListening();
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

  const partnerName = level === "B2" ? "Dr. Tobias Wendt" : cfg.persona.name;

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

      {providers.llm === "mock" && <p className="mt-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-muted">{t("mock_banner")}</p>}
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
        {interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-ee-md border-2 border-dashed border-accent px-4 py-2.5 text-accent">
              <p className="de" lang="de">
                {interim}
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
              <button className="btn btn-ghost !min-h-[30px] !py-0 !px-2 text-xs" onClick={() => speaker.current?.speakNow(hint.rephrase, opts(0.85))}>
                <IconRepeat size={14} />
              </button>
            </p>
            <p>
              <b>{t("conv_hint_starter")}:</b>{" "}
              <button className="de underline decoration-dotted" lang="de" onClick={() => setTyped(hint.starter.replace(/…/g, "").trim() + " ")}>
                {hint.starter}
              </button>
            </p>
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

      {/* dock */}
      <div className="border-t border-line pt-3 space-y-3">
        <div className="flex sm:flex-wrap sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          <ToolButton onClick={() => speaker.current?.speakNow(lastPartner.current, opts())} disabled={!lastPartner.current} icon={<IconRepeat size={18} />} label={t("conv_repeat")} />
          <ToolButton onClick={() => speaker.current?.speakNow(lastPartner.current, opts(0.7))} disabled={!lastPartner.current} icon={<IconSlow size={18} />} label={t("conv_slower")} />
          <ToolButton onClick={askHint} disabled={!lastPartner.current || hintLoading} icon={<IconHelp size={18} />} label={hintLoading ? t("loading") : t("conv_stuck")} />
          <ToolButton
            onClick={toggleShowText}
            pressed={!showText}
            icon={showText ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            label={showText ? t("conv_hide_text") : t("conv_show_text")}
          />
          <ToolButton onClick={toggleAutoTurn} pressed={autoTurn} icon={<IconMic size={18} />} label={t("conv_autoturn")} />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="orb !w-20 !h-20 sm:!w-28 sm:!h-28" data-state={phase} style={{ ["--lvl" as string]: micLevel }}>
            <button
              className="relative z-10 grid place-items-center w-full h-full rounded-full text-white touch-none select-none"
              onPointerDown={onMicDown}
              onPointerUp={onMicUp}
              onPointerLeave={onMicUp}
              onKeyDown={(e) => {
                if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                  e.preventDefault();
                  onMicDown();
                }
              }}
              onKeyUp={(e) => {
                if (e.key === " " || e.key === "Enter") onMicUp();
              }}
              disabled={busy || ending || !sttProvider}
              aria-pressed={listening}
              aria-label={listening ? t("conv_tap_stop") : t("conv_hold")}
            >
              {listening ? <IconSend size={30} /> : <IconMic size={34} />}
            </button>
          </div>
          <p className="text-xs text-muted text-center">{!sttProvider ? t("err_no_stt") : autoTurn ? t("conv_handsfree_on") : listening ? t("conv_tap_stop") : t("conv_hold")}</p>
        </div>

        <form onSubmit={submitTyped} className="flex gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t("conv_type")}
            lang="de"
            dir="ltr"
            autoComplete="off"
            className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 de min-h-[44px]"
            aria-label={t("conv_type")}
            disabled={ending}
          />
          <button className="btn btn-primary !px-4" disabled={!typed.trim() || busy || ending} aria-label={t("conv_send")}>
            <IconSend size={18} />
          </button>
        </form>
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
