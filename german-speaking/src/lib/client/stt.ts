"use client";

// Speech-to-text. Default: the Web Speech API (`SpeechRecognition`, lang de-DE, Chrome/Edge).
// Optional: record with MediaRecorder and transcribe on the server (/api/stt → Whisper).
// Both expose the same small interface so the conversation screen doesn't care which one runs.

export interface STTResult {
  text: string;
  confidence: number | null;
  alternatives: string[];
}

export type STTErrorCode = "not-allowed" | "no-speech" | "network" | "unsupported" | "audio-capture" | "aborted" | "server";

export interface STTHandlers {
  onInterim?: (text: string) => void;
  onSpeechStart?: () => void;
  onFinal: (r: STTResult) => void;
  onError?: (code: STTErrorCode) => void;
  onEnd?: () => void;
}

export interface STTSession {
  /** Stop listening and deliver what was heard (onFinal fires if anything was recognised). */
  stop(): void;
  /** Stop and discard. */
  abort(): void;
}

export interface STTProvider {
  id: "webspeech" | "server";
  /** `autoStopMs`: in hands-free mode, finish after this much silence following speech. */
  start(h: STTHandlers, opts: { autoStopMs?: number }): STTSession;
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

export function serverRecordingSupported() {
  return typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;
}

export class WebSpeechSTT implements STTProvider {
  id = "webspeech" as const;

  start(h: STTHandlers, opts: { autoStopMs?: number }): STTSession {
    const Ctor = srCtor();
    if (!Ctor) {
      h.onError?.("unsupported");
      h.onEnd?.();
      return { stop() {}, abort() {} };
    }
    const rec = new Ctor();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    const finals: { text: string; conf: number | null; alts: string[] }[] = [];
    let interim = "";
    let discarded = false;
    let delivered = false;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    const deliver = () => {
      if (delivered || discarded) return;
      delivered = true;
      // If the browser never finalised the last bit, use the interim text (no confidence).
      const parts = finals.length ? finals : interim.trim() ? [{ text: interim.trim(), conf: null, alts: [] }] : [];
      const text = parts.map((p) => p.text).join(" ").replace(/\s+/g, " ").trim();
      if (!text) return;
      const confs = parts.map((p) => p.conf).filter((c): c is number => c !== null && c > 0);
      h.onFinal({
        text,
        confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null,
        alternatives: parts.flatMap((p) => p.alts).slice(0, 4),
      });
    };

    rec.onspeechstart = () => h.onSpeechStart?.();
    rec.onresult = (e) => {
      interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const alts: string[] = [];
          for (let a = 1; a < r.length; a++) alts.push(r[a].transcript.trim());
          finals.push({ text: r[0].transcript.trim(), conf: r[0].confidence ?? null, alts });
        } else {
          interim += r[0].transcript;
        }
      }
      h.onInterim?.([...finals.map((f) => f.text), interim].join(" ").trim());
      if (opts.autoStopMs) {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => rec.stop(), opts.autoStopMs);
      }
    };
    rec.onerror = (e) => {
      const code = (["not-allowed", "service-not-allowed"].includes(e.error) ? "not-allowed" : e.error) as STTErrorCode;
      if (code !== "aborted" && code !== "no-speech") h.onError?.(code);
      if (code === "no-speech" && !finals.length && !interim) h.onError?.("no-speech");
    };
    rec.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      deliver();
      h.onEnd?.();
    };
    try {
      rec.start();
    } catch {
      h.onError?.("aborted");
    }
    return {
      stop: () => {
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
      },
      abort: () => {
        discarded = true;
        try {
          rec.abort();
        } catch {
          /* already stopped */
        }
      },
    };
  }
}

export class ServerSTT implements STTProvider {
  id = "server" as const;

  start(h: STTHandlers, opts: { autoStopMs?: number }): STTSession {
    let discarded = false;
    let stopRequested = false;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    const chunks: Blob[] = [];

    const cleanup = () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => {});
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        h.onError?.("not-allowed");
        h.onEnd?.();
        return;
      }
      if (stopRequested || discarded) {
        cleanup();
        h.onEnd?.();
        return;
      }
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        cleanup();
        if (discarded || !chunks.length) return h.onEnd?.();
        try {
          const fd = new FormData();
          fd.append("audio", new Blob(chunks, { type: recorder?.mimeType || "audio/webm" }));
          const res = await fetch("/api/stt", { method: "POST", body: fd });
          if (!res.ok) throw new Error(String(res.status));
          const data = (await res.json()) as { text: string; confidence: number | null };
          if (data.text) h.onFinal({ text: data.text, confidence: data.confidence, alternatives: [] });
          else h.onError?.("no-speech");
        } catch {
          h.onError?.("server");
        }
        h.onEnd?.();
      };
      recorder.start(250);

      // Tiny energy-based voice activity detection for hands-free mode.
      ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let spoke = false;
      let lastLoud = performance.now();
      const startedAt = performance.now();
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += (v - 128) * (v - 128);
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (rms > 6) {
          if (!spoke) h.onSpeechStart?.();
          spoke = true;
          lastLoud = now;
        }
        if (opts.autoStopMs && spoke && now - lastLoud > opts.autoStopMs) return recorder?.state === "recording" && recorder.stop();
        if (opts.autoStopMs && !spoke && now - startedAt > 8000) {
          discarded = true;
          h.onError?.("no-speech");
          return recorder?.state === "recording" && recorder.stop();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return {
      stop: () => {
        stopRequested = true;
        if (recorder?.state === "recording") recorder.stop();
      },
      abort: () => {
        discarded = true;
        if (recorder?.state === "recording") recorder.stop();
        else cleanup();
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

/** Rough check whether recognised text is just our own TTS leaking into the mic (barge-in echo). */
export function looksLikeEcho(heard: string, partnerText: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const h = norm(heard);
  if (h.length === 0) return true;
  const p = new Set(norm(partnerText));
  const overlap = h.filter((w) => p.has(w)).length / h.length;
  return overlap >= 0.6;
}
