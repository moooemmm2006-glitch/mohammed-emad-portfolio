"use client";

// Celebration sounds made in code with the Web Audio API (oscillators + noise), so there are no
// sound files and nothing copyrighted: the vault "clack", a "cha-ching" of coins, a rising chime,
// and a soft chime for the end of a break. Moderate volume (~0.4).

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a click (e.g. "يلا نبدأ") so the browser allows sound when the timer ends later. */
export function unlockFocusAudio() {
  audio();
}

const VOLUME = 0.4;

function tone(c: AudioContext, out: AudioNode, freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 1, slideTo?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(out);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(c: AudioContext, out: AudioNode, start: number, dur: number, freq: number, gain: number) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = 1.2;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(out);
  src.start(start);
}

function master(c: AudioContext, volume = VOLUME) {
  const g = c.createGain();
  g.gain.value = volume;
  g.connect(c.destination);
  return g;
}

/** The full celebration: vault clack (0 s) → cha-ching (≈0.75 s) → rising chime (≈1.3 s). */
export function playVaultCelebration() {
  const c = audio();
  if (!c) return;
  const out = master(c);
  const t = c.currentTime + 0.05;
  // metallic unlock "clack": two short noise hits + a low thud
  noise(c, out, t, 0.08, 2200, 0.9);
  tone(c, out, 120, t, 0.18, "triangle", 0.6, 60);
  noise(c, out, t + 0.16, 0.07, 3200, 0.7);
  tone(c, out, 1800, t + 0.16, 0.05, "square", 0.08);
  // "cha-ching": a bright noise "cha" and two bell-like "ching"s, then a sprinkle of coins
  const cc = t + 0.75;
  noise(c, out, cc, 0.12, 5000, 0.5);
  for (const [f, d] of [
    [2637, 0.5],
    [3520, 0.6],
  ] as const) {
    tone(c, out, f, cc + 0.1, d, "sine", 0.35);
    tone(c, out, f * 2.01, cc + 0.1, d * 0.7, "sine", 0.12);
  }
  for (let i = 0; i < 7; i++) tone(c, out, 2400 + Math.random() * 2400, cc + 0.25 + i * 0.07 + Math.random() * 0.03, 0.12, "triangle", 0.12);
  // short cheerful rising chime (C – E – G – C)
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(c, out, f, t + 1.35 + i * 0.11, 0.45, "sine", 0.3);
    tone(c, out, f * 2, t + 1.35 + i * 0.11, 0.3, "sine", 0.06);
  });
}

/** End of a break: one soft two-note chime, no vault. */
export function playSoftChime() {
  const c = audio();
  if (!c) return;
  const out = master(c, VOLUME * 0.7);
  const t = c.currentTime + 0.05;
  tone(c, out, 659.25, t, 0.8, "sine", 0.35);
  tone(c, out, 987.77, t + 0.18, 1.0, "sine", 0.3);
}
