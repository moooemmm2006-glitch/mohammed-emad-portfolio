/** Deterministic randomness from a string (the slug), so a demo always reads the same. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function rng(seed: string | number): () => number {
  let a = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one item; `salt` keeps picks for different fields independent. */
export function pick<T>(list: readonly T[], seed: string, salt = ""): T {
  return list[Math.floor(rng(seed + "|" + salt)() * list.length)];
}

/** Pick n distinct items in a stable shuffled order. */
export function pickN<T>(list: readonly T[], n: number, seed: string, salt = ""): T[] {
  const r = rng(seed + "|" + salt);
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}
