"use client";

import Link from "next/link";
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
import { loadVoices, Speaker, speakOptionsFor, unlockSpeech, webSpeechMaxSpeed } from "@/lib/client/tts";
import type { Hint, TurnEvent } from "@/lib/conversation";
import { LEVEL_CONFIG, tagLabel, type Level } from "@/lib/levels";
import { SPEEDS, type Settings } from "@/lib/settings";
import { Avatar } from "./Avatar";
import { IconArrow, IconEye, IconEyeOff, IconHelp, IconMic, IconRepeat, IconStop, IconX } from "./Icons";

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
  const [audioError, setAudioError] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const [dockH, setDockH] = useState(260);
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
      speaker.current?.beginReply();
      setAudioError(false);
      const partnerKey = nextKey();
      lastPartner.current = "";
      setTurns((ts) => [
        ...ts,
        ...(text ? [{ key: nextKey(), role: "user" as const, text, confidence: meta.confidence }] : []),
        { key: partnerKey, role: "partner", text: "", pending: true },
      ]);
      let finalText = "";
      let failed = false;
      let limitHit = false;
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
        limitHit = err instanceof ApiError && err.code === "usage_limit";
      }
      busyRef.current = false;
      setBusy(false);
      setLockStatus(null);
      if (failed || !finalText) {
        setTurns((ts) => ts.filter((x) => x.key !== partnerKey));
        // The daily limit isn't an error to retry: say so kindly and stop here.
        setError(limitHit ? "err_usage_limit" : navigator.onLine ? "err_api" : "err_offline");
        setCanRetry(!limitHit);
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
    // Only reached when a sentence failed even after the retry with a fallback voice.
    s.onError = () => setAudioError(true);
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

  // The page itself scrolls (no inner box): keep the newest message in view above the dock.
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [turns, live]);

  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDockH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    try {
      setBannerHidden(sessionStorage.getItem("gs.demoBanner") === "hidden");
    } catch {
      /* ignore */
    }
    void loadVoices(); // voices load asynchronously; start early
  }, []);
  const hideBanner = () => {
    setBannerHidden(true);
    try {
      sessionStorage.setItem("gs.demoBanner", "hidden");
    } catch {
      /* ignore */
    }
  };

  const retryAudio = () => {
    unlockSpeech();
    setAudioError(false);
    if (lastPartner.current) speaker.current?.speakNow(lastPartner.current, speakOpts());
  };

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
    unlockSpeech(); // a tap is the user gesture browsers need before speech can play
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

  const bubbleText = "text-[1.12rem] sm:text-[1.2rem] leading-relaxed";

  return (
    <div className={`level-${level.toLowerCase()} min-h-[100dvh] md:min-h-[calc(100dvh-4rem)] flex flex-col`}>
      {/* top bar */}
      <header className="sticky top-0 md:top-16 z-20 bg-bg/85 backdrop-blur-md border-b border-line/70">
        <div className="mx-auto max-w-[820px] px-4 h-14 flex items-center gap-3">
          <Link href="/speak" className="grid place-items-center w-9 h-9 -ms-1 rounded-full hover:bg-surface-2 text-muted" aria-label={t("back")}>
            <IconArrow size={20} className="rotate-180 rtl:rotate-0" />
          </Link>
          <Avatar level={level} size={36} />
          <div className="min-w-0 leading-tight">
            <div className="font-bold text-[0.95rem] flex items-center gap-1.5">
              <span className="de truncate">{partnerName}</span>
              <span className="rounded-full px-1.5 py-px text-[10px] font-bold text-white bg-accent de">{level}</span>
            </div>
            <div className="text-xs text-muted truncate" aria-live="polite">
              {t(statusKey)}
            </div>
          </div>
          <button className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-danger/40 text-danger px-3 h-9 text-sm font-semibold hover:bg-danger/10" onClick={endConversation} disabled={ending}>
            <IconStop size={15} />
            {t("conv_end")}
          </button>
        </div>
        {providers.llm === "mock" && !bannerHidden && (
          <div className="border-t border-line/60 bg-gold/10">
            <div className="mx-auto max-w-[820px] px-4 py-1.5 flex items-center gap-2 text-xs">
              <span className="flex-1">{t("mock_banner")}</span>
              <button onClick={hideBanner} className="p-1 rounded-full hover:bg-surface-2" aria-label={t("conv_hint_close")}>
                <IconX size={14} />
              </button>
            </div>
          </div>
        )}
        {offline && (
          <p role="alert" className="bg-danger/10 text-danger text-center text-sm py-1.5">
            {t("err_offline")}
          </p>
        )}
      </header>

      {/* messages: the page scrolls, no inner box */}
      <main className="flex-1 mx-auto w-full max-w-[820px] px-4 pt-5 space-y-4" style={{ paddingBottom: dockH + 24 }} aria-live="polite" aria-relevant="additions">
        {p.resumed && <p className="text-center text-xs text-muted">{t("conv_resumed")}</p>}
        {p.focusTag && settings.focusSteering && (
          <p className="text-center text-xs text-muted">
            {t("conv_focus")}: <b>{tagLabel(p.focusTag, lang)}</b>
          </p>
        )}
        {turns.map((m) =>
          m.role === "partner" ? (
            <div key={m.key} className="msg-in flex gap-2.5 items-end">
              <Avatar level={level} size={32} className="mb-1" decorative />
              <div className="max-w-[88%] sm:max-w-[80%] rounded-3xl rounded-es-lg bg-surface border border-line/70 px-5 py-3 shadow-card">
                {m.pending && !m.text ? (
                  <span className="wave inline-flex items-center h-7" aria-label={t("conv_state_thinking")}>
                    <span />
                    <span />
                    <span />
                  </span>
                ) : showText || m.revealed ? (
                  <p className={`${bubbleText} [unicode-bidi:plaintext]`} lang="de" dir="auto">
                    {m.text}
                  </p>
                ) : (
                  <button className="text-start" onClick={() => setTurns((ts) => ts.map((x) => (x.key === m.key ? { ...x, revealed: true } : x)))}>
                    <span className={`de blur-text ${bubbleText}`} aria-hidden="true">
                      {m.text}
                    </span>
                    <span className="block text-xs text-muted mt-1">{t("conv_reveal")}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div key={m.key} className="msg-in flex justify-end">
              <div className="max-w-[88%] sm:max-w-[80%] rounded-3xl rounded-ee-lg bg-accent text-white px-5 py-3 shadow-card">
                <p className={`de ${bubbleText}`} lang="de">
                  {m.text}
                </p>
                {m.confidence != null && m.confidence < 0.6 && <p className="text-xs opacity-80 mt-0.5">⚠ {t("conv_low_conf")}</p>}
              </div>
            </div>
          ),
        )}
        {listening && (
          <div className="msg-in flex justify-end">
            <div className="max-w-[88%] sm:max-w-[80%] rounded-3xl rounded-ee-lg border-2 border-dashed border-accent bg-accent-soft px-5 py-3 text-accent min-w-24">
              <p className={`de ${bubbleText}`} lang="de">
                {live || (
                  <span className="wave inline-flex items-center h-7" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* dock */}
      <div ref={dockRef} className="fixed bottom-0 inset-x-0 z-20">
        <div className="h-8 bg-gradient-to-t from-bg to-transparent pointer-events-none" aria-hidden="true" />
        <div className="bg-bg/90 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-[820px] px-4 space-y-3">
            {error && (
              <div role="alert" className="rounded-2xl bg-danger/10 text-danger px-4 py-2 text-sm flex items-center gap-3">
                <span className="flex-1">{t(error)}</span>
                {canRetry && (
                  <button className="btn btn-ghost !min-h-[32px] !py-1 text-sm" onClick={() => void sendTurn(null)}>
                    {t("conv_retry")}
                  </button>
                )}
              </div>
            )}
            {audioError && !error && (
              <div role="alert" className="rounded-2xl bg-danger/10 text-danger px-4 py-2 text-sm flex items-center gap-3">
                <span className="flex-1">{t("err_audio")}</span>
                <button className="btn btn-ghost !min-h-[32px] !py-1 text-sm" onClick={retryAudio}>
                  {t("conv_retry")}
                </button>
              </div>
            )}

            <div className="flex sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5 [scrollbar-width:none]">
              <ToolButton onClick={() => speaker.current?.speakNow(lastPartner.current, speakOpts())} disabled={!lastPartner.current || busy} icon={<IconRepeat size={17} />} label={t("conv_repeat")} />
              <button
                className="chip shrink-0 whitespace-nowrap hover:bg-surface-2 min-h-[38px] tabular-nums"
                onClick={cycleSpeed}
                aria-label={`${t("conv_speed")}: ${speed}×`}
                title={capped ? `${t("conv_speed_max")}: ${maxSpeed}×` : undefined}
              >
                <span className="text-xs sm:text-sm">{t("conv_speed")}</span>
                <b className="de text-sm">{speed}×</b>
                {capped && <span className="text-[10px] text-muted de">(max {maxSpeed}×)</span>}
              </button>
              <ToolButton onClick={askHint} disabled={!lastPartner.current || hintLoading || busy} icon={<IconHelp size={17} />} label={hintLoading ? t("loading") : t("conv_stuck")} />
              <ToolButton
                onClick={toggleShowText}
                pressed={!showText}
                icon={showText ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                label={showText ? t("conv_hide_text") : t("conv_show_text")}
              />
              <ToolButton onClick={toggleAutoTurn} pressed={autoTurn} icon={<IconMic size={17} />} label={t("conv_autoturn")} />
            </div>

            {provider ? (
              <div className="flex flex-col items-center gap-1.5">
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
              <p role="alert" className="rounded-2xl bg-danger/10 text-danger px-4 py-3 text-sm text-center">
                {t("err_no_stt")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* "مش فاهم" help: a bottom sheet over the dock */}
      {hint && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={t("conv_stuck")}>
          <button className="absolute inset-0 bg-black/35 sheet-fade" aria-label={t("conv_hint_close")} onClick={() => setHint(null)} />
          <div className="sheet-up absolute bottom-0 inset-x-0 mx-auto max-w-[820px] max-h-[78dvh] overflow-y-auto rounded-t-3xl bg-surface shadow-2xl px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="mx-auto w-10 h-1.5 rounded-full bg-line" aria-hidden="true" />
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-gold">{t("conv_stuck")} 🙂</h3>
              <button className="btn btn-ghost !min-h-[34px] !px-2" onClick={() => setHint(null)} aria-label={t("conv_hint_close")}>
                <IconX size={16} />
              </button>
            </div>
            <p>
              <b>{t("conv_hint_meaning")}:</b> <span dir="auto">{hint.meaning}</span>
            </p>
            <p>
              <b>{t("conv_hint_tip")}:</b> <span dir="auto">{hint.hint}</span>
            </p>
            <div className="rounded-2xl bg-surface-2 p-3 flex items-center gap-2">
              <div className="flex-1">
                <b className="block text-sm text-muted">{t("conv_hint_simpler")}</b>
                <span className={`de ${bubbleText}`} lang="de">
                  {hint.rephrase}
                </span>
              </div>
              <button className="btn btn-ghost !min-h-[36px] !px-3" onClick={() => speaker.current?.speakNow(hint.rephrase, speakOpts())} aria-label={t("conv_repeat")}>
                <IconRepeat size={16} />
              </button>
            </div>
            <p>
              <b>{t("conv_hint_starter")}:</b>{" "}
              <span className="de" lang="de">
                {hint.starter}
              </span>
            </p>
            <button className="btn btn-primary w-full" onClick={() => setHint(null)}>
              {t("conv_hint_close")}
            </button>
          </div>
        </div>
      )}
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
