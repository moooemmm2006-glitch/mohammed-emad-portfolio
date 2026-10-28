"use client";

// Speech-to-text for one learner TURN.
//
// The learner may pause, hesitate and think: a turn ends ONLY after `silenceMs` without any new
// recognised speech (or when they tap "done"). Browsers stop recognition on their own after short
// pauses (Chrome on Android especially), so the recogniser is restarted automatically and keeps
// appending to the same transcript until the turn is really over. Then the whole turn is sent
// once.
//
// Default provider: Web Speech API (de-DE, Chrome/Edge). Optional: record with MediaRecorder and
// transcribe on the server (/api/stt → Whisper), with the same silence rule.

import { TurnTranscript, type Segment, type TurnResult } from "./transcript";

export type STTErrorCode = "not-allowed" | "network" | "unsupported" | "audio-capture" | "server";

export interface TurnHandlers {
  /** Live text of the turn so far (Web Speech only). */
  onTranscript?: (text: string) => void;
  /** Time (performance.now()) of the latest recognised speech — drives the "about to send" ring. */
  onActivity?: (at: number) => void;
  /** The finished turn, sent once. Never called for an empty turn. */
  onFinal: (r: TurnResult) => void;
  onError?: (code: STTErrorCode) => void;
  /** Listening stopped (after sending, cancelling or an error). */
  onEnd?: () => void;
}

export interface TurnOptions {
  silenceMs: number;
  /** Give up quietly if nothing at all is said for this long. */
  maxIdleMs?: number;
  /** Words already heard before the turn started (barge-in). */
  seed?: string;
}

export interface TurnSession {
  /** "I'm done": send what was said now. */
  finish(): void;
  /** Stop and discard. */
  abort(): void;
  readonly hasSpeech: boolean;
}

export interface TurnProvider {
  id: "webspeech" | "server";
  start(h: TurnHandlers, o: TurnOptions): TurnSession;
}

// ---- Web Speech API typings (not in lib.dom for all TS versions) ----
interface SRAlternative {
  transcript: string;
  confidence: number;
}
interface SRResult {
  isFinal: boolean;
  length: number;
  [i: number]: SRAlternative;
}
interface SREvent {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
}
type SRCtor = new () => SR;

function srCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function webSpeechSupported() {
  return srCtor() !== null;
}

export function isAndroid() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

export function serverRecordingSupported() {
  return typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;
}

function segmentsOf(e: SREvent): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < e.results.length; i++) {
    const r = e.results[i];
    const alts: string[] = [];
    for (let a = 1; a < r.length; a++) alts.push(r[a].transcript.trim());
    out.push({ text: r[0].transcript, isFinal: r.isFinal, confidence: r.isFinal ? (r[0].confidence ?? null) : null, alternatives: alts });
  }
  return out;
}

function newRecognizer(): SR | null {
  const Ctor = srCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "de-DE";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  return rec;
}

const FATAL: Record<string, STTErrorCode> = {
  "not-allowed": "not-allowed",
  "service-not-allowed": "not-allowed",
  "audio-capture": "audio-capture",
  network: "network",
  "language-not-supported": "unsupported",
};

export class WebSpeechTurn implements TurnProvider {
  id = "webspeech" as const;

  start(h: TurnHandlers, o: TurnOptions): TurnSession {
    const transcript = new TurnTranscript(o.seed);
    let rec: SR | null = null;
    let open = true; // the turn is still going
    let closing = false; // silence reached / "done" tapped: deliver on the next `end`
    let ended = false;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    let restarts: number[] = [];

    const clearTimers = () => {
      for (const t of [silenceTimer, idleTimer, safetyTimer]) if (t) clearTimeout(t);
      silenceTimer = idleTimer = safetyTimer = null;
    };

    const end = (deliver: boolean) => {
      if (ended) return;
      ended = true;
      open = false;
      clearTimers();
      if (deliver) {
        const r = transcript.result();
        if (r) h.onFinal(r);
      }
      h.onEnd?.();
    };

    const close = () => {
      if (closing || ended) return;
      closing = true;
      clearTimers();
      try {
        rec?.stop();
      } catch {
        /* not running */
      }
      // If the browser never fires `end`, still send.
      safetyTimer = setTimeout(() => {
        transcript.commitSession();
        end(true);
      }, 1500);
    };

    const armSilence = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (transcript.hasSpeech) silenceTimer = setTimeout(close, o.silenceMs);
    };

    const activity = () => {
      h.onActivity?.(performance.now());
      armSilence();
    };

    const startRec = () => {
      if (!open || closing) return;
      rec = newRecognizer();
      if (!rec) {
        h.onError?.("unsupported");
        return end(false);
      }
      rec.onspeechstart = activity;
      rec.onresult = (e) => {
        transcript.update(segmentsOf(e));
        h.onTranscript?.(transcript.text());
        activity();
      };
      rec.onerror = (e) => {
        const fatal = FATAL[e.error];
        if (fatal) {
          h.onError?.(fatal);
          end(false);
        }
        // "no-speech" and "aborted" are normal during pauses: `end` follows and we restart.
      };
      rec.onend = () => {
        transcript.commitSession();
        if (closing) return end(true);
        if (!open) return;
        // The browser stopped by itself during a pause: the turn is still open, keep listening.
        const now = performance.now();
        restarts = restarts.filter((t) => now - t < 5000);
        restarts.push(now);
        if (restarts.length > 10) {
          // Restarting in a tight loop (mic busy, service down): give up gracefully.
          if (transcript.hasSpeech) end(true);
          else end(false);
          return;
        }
        setTimeout(startRec, 60);
      };
      try {
        rec.start();
      } catch {
        setTimeout(startRec, 250);
      }
    };

    if (o.maxIdleMs) {
      idleTimer = setTimeout(() => {
        if (!transcript.hasSpeech) {
          closing = true;
          try {
            rec?.abort();
          } catch {
            /* not running */
          }
          end(false);
        }
      }, o.maxIdleMs);
    }
    if (transcript.hasSpeech) {
      h.onTranscript?.(transcript.text());
      activity();
    }
    startRec();

    return {
      finish: () => (transcript.hasSpeech ? close() : (rec?.abort(), end(false))),
      abort: () => {
        try {
          rec?.abort();
        } catch {
          /* not running */
        }
        end(false);
      },
      get hasSpeech() {
        return transcript.hasSpeech;
      },
    };
  }
}

/** Whisper provider: record the whole turn, end it with the same silence rule (energy-based), transcribe once. */
export class ServerTurn implements TurnProvider {
  id = "server" as const;

  start(h: TurnHandlers, o: TurnOptions): TurnSession {
    let discarded = false;
    let spoke = false;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let ended = false;
    const chunks: Blob[] = [];

    const done = () => {
      if (ended) return;
      ended = true;
      h.onEnd?.();
    };
    const cleanup = () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => {});
    };
    const stop = () => {
      if (recorder?.state === "recording") recorder.stop();
      else {
        cleanup();
        done();
      }
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        h.onError?.("not-allowed");
        return done();
      }
      if (discarded) {
        cleanup();
        return done();
      }
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        cleanup();
        if (discarded || !spoke || !chunks.length) return done();
        try {
          const fd = new FormData();
          fd.append("audio", new Blob(chunks, { type: recorder?.mimeType || "audio/webm" }));
          const res = await fetch("/api/stt", { method: "POST", body: fd });
          if (!res.ok) throw new Error(String(res.status));
          const data = (await res.json()) as { text: string; confidence: number | null };
          const text = [o.seed, data.text].filter(Boolean).join(" ").trim();
          if (text) h.onFinal({ text, confidence: data.confidence, alternatives: [] });
        } catch {
          h.onError?.("server");
        }
        done();
      };
      recorder.start(250);

      ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const startedAt = performance.now();
      let lastLoud = startedAt;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += (v - 128) * (v - 128);
        const now = performance.now();
        if (Math.sqrt(sum / buf.length) > 6) {
          spoke = true;
          lastLoud = now;
          h.onActivity?.(now);
        }
        if (spoke && now - lastLoud > o.silenceMs) return stop();
        if (!spoke && o.maxIdleMs && now - startedAt > o.maxIdleMs) {
          discarded = true;
          return stop();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return {
      finish: stop,
      abort: () => {
        discarded = true;
        stop();
      },
      get hasSpeech() {
        return spoke;
      },
    };
  }
}

/** Live microphone level (0..1) for the animated orb. */
export async function openMicMeter(onLevel: (v: number) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  let raf = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += (v - 128) * (v - 128);
    onLevel(Math.min(1, Math.sqrt(sum / buf.length) / 30));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => {});
  };
}
