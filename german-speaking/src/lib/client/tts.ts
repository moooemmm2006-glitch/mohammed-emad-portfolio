"use client";

// Pluggable text-to-speech. Default: the browser's Web Speech API with a different German voice,
// rate and pitch per level. Optional: the server provider (/api/tts → OpenAI or ElevenLabs);
// on any failure we silently fall back to the browser voice.

import { LEVEL_CONFIG, LEVELS, type Level } from "../levels";
import type { Settings } from "../settings";

export interface SpeakOptions {
  level: Level;
  voiceURI?: string | null;
  rate?: number;
  pitch?: number;
  speed?: number; // global multiplier (settings + "slower" button)
}

export interface TTSProvider {
  id: "webspeech" | "server";
  speak(text: string, o: SpeakOptions): Promise<void>;
  stop(): void;
}

const FEMALE = /(katja|anna|petra|helena|hedda|amala|vicki|marlene|seraphina|ingrid|leni|elke|klara|female|frau|sabine|gisela|louisa|tanja)/i;
const MALE = /(conrad|stefan|markus|yannick|hans|killian|jonas|florian|bernd|kasper|ralf|male|herr|christoph|daniel|reed)/i;

export function germanVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de"));
}

export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve([]);
    const now = germanVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(germanVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

/** Give each level a different default voice where possible (gender + regional variant preferences). */
export function defaultVoiceAssignment(voices: SpeechSynthesisVoice[]): Record<Level, SpeechSynthesisVoice | null> {
  const used = new Set<string>();
  const out = {} as Record<Level, SpeechSynthesisVoice | null>;
  for (const level of LEVELS) {
    const { persona, voice } = LEVEL_CONFIG[level];
    const score = (v: SpeechSynthesisVoice) => {
      let s = 0;
      const langIdx = voice.preferLangs.findIndex((l) => v.lang.replace("_", "-").toLowerCase() === l.toLowerCase());
      s += langIdx >= 0 ? 10 - langIdx * 2 : 0;
      if (persona.gender === "female" ? FEMALE.test(v.name) : MALE.test(v.name)) s += 8;
      if (persona.gender === "female" ? MALE.test(v.name) : FEMALE.test(v.name)) s -= 8;
      if (/google|natural|online|neural|premium|enhanced/i.test(v.name)) s += 3;
      if (used.has(v.voiceURI)) s -= 20;
      return s;
    };
    const best = [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
    if (best) used.add(best.voiceURI);
    out[level] = best;
  }
  return out;
}

export class WebSpeechTTS implements TTSProvider {
  id = "webspeech" as const;
  // Chrome may garbage-collect utterances before `end` fires; keep references alive.
  private live = new Set<SpeechSynthesisUtterance>();

  static supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  async speak(text: string, o: SpeakOptions): Promise<void> {
    if (!WebSpeechTTS.supported()) throw new Error("no_tts");
    const voices = await loadVoices();
    const cfg = LEVEL_CONFIG[o.level].voice;
    const chosen = (o.voiceURI && voices.find((v) => v.voiceURI === o.voiceURI)) || defaultVoiceAssignment(voices)[o.level];
    return new Promise((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = chosen?.lang ?? "de-DE";
      if (chosen) u.voice = chosen;
      u.rate = Math.max(0.4, Math.min(1.6, (o.rate ?? cfg.rate) * (o.speed ?? 1)));
      u.pitch = o.pitch ?? cfg.pitch;
      this.live.add(u);
      // Some browsers occasionally never fire `end`; don't let the conversation hang on it.
      const guard = setTimeout(() => finish(), 4000 + (text.length * 110) / u.rate);
      const finish = () => {
        clearTimeout(guard);
        this.live.delete(u);
        resolve();
      };
      u.onend = finish;
      u.onerror = (e) => {
        clearTimeout(guard);
        this.live.delete(u);
        if (e.error === "interrupted" || e.error === "canceled") resolve();
        else reject(new Error(e.error));
      };
      window.speechSynthesis.speak(u);
    });
  }

  stop() {
    if (WebSpeechTTS.supported()) window.speechSynthesis.cancel();
    this.live.clear();
  }
}

export class ServerTTS implements TTSProvider {
  id = "server" as const;
  private audio: HTMLAudioElement | null = null;
  private abort: AbortController | null = null;
  private resolveCurrent: (() => void) | null = null;

  async speak(text: string, o: SpeakOptions): Promise<void> {
    this.abort = new AbortController();
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, level: o.level, speed: o.speed ?? 1 }),
      signal: this.abort.signal,
    });
    if (!res.ok) throw new Error(`tts_${res.status}`);
    const url = URL.createObjectURL(await res.blob());
    try {
      await new Promise<void>((resolve, reject) => {
        const a = new Audio(url);
        this.audio = a;
        this.resolveCurrent = resolve;
        a.onended = () => resolve();
        a.onerror = () => reject(new Error("audio_error"));
        a.play().catch(reject);
      });
    } finally {
      URL.revokeObjectURL(url);
      this.audio = null;
      this.resolveCurrent = null;
    }
  }

  stop() {
    this.abort?.abort();
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }
    this.resolveCurrent?.();
  }
}

export type SpeakerState = "idle" | "speaking";

/**
 * Sentence queue on top of a provider: enqueue sentences as they stream in,
 * stop() empties the queue immediately (barge-in), whenIdle() resolves after the last sentence.
 */
export class Speaker {
  private queue: { text: string; o: SpeakOptions }[] = [];
  private running = false;
  private generation = 0;
  private idleWaiters: (() => void)[] = [];
  private web = new WebSpeechTTS();
  private server = new ServerTTS();
  private serverBroken = false;
  onState: (s: SpeakerState) => void = () => {};
  onError: (e: Error) => void = () => {};

  constructor(private useServer: () => boolean) {}

  get speaking() {
    return this.running;
  }

  enqueue(text: string, o: SpeakOptions) {
    if (!text.trim()) return;
    this.queue.push({ text, o });
    if (!this.running) void this.run();
  }

  speakNow(text: string, o: SpeakOptions) {
    this.stop();
    this.enqueue(text, o);
  }

  stop() {
    this.generation++;
    this.queue = [];
    this.web.stop();
    this.server.stop();
    if (this.running) {
      this.running = false;
      this.onState("idle");
      this.flushIdle();
    }
  }

  whenIdle(): Promise<void> {
    if (!this.running && this.queue.length === 0) return Promise.resolve();
    return new Promise((r) => this.idleWaiters.push(r));
  }

  private flushIdle() {
    const w = this.idleWaiters;
    this.idleWaiters = [];
    w.forEach((f) => f());
  }

  private async run() {
    const gen = this.generation;
    this.running = true;
    this.onState("speaking");
    while (this.queue.length && gen === this.generation) {
      const { text, o } = this.queue.shift()!;
      try {
        if (this.useServer() && !this.serverBroken) {
          try {
            await this.server.speak(text, o);
          } catch (err) {
            if (gen !== this.generation) break;
            if ((err as Error).name !== "AbortError") {
              this.serverBroken = true; // silently fall back for the rest of the session
              await this.web.speak(text, o);
            }
          }
        } else {
          await this.web.speak(text, o);
        }
      } catch (err) {
        this.onError(err as Error);
      }
    }
    if (gen === this.generation) {
      this.running = false;
      this.onState("idle");
      this.flushIdle();
    }
  }
}

export function speakOptionsFor(level: Level, settings: Settings, extraSpeed = 1): SpeakOptions {
  const v = settings.voices[level];
  return { level, voiceURI: v?.voiceURI ?? null, rate: v?.rate, pitch: v?.pitch, speed: settings.speechSpeed * extraSpeed };
}
