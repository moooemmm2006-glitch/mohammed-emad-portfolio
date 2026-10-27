import type { Level } from "./levels";

// Which book topics belong to which level (safe to import in the browser — no book data here).

/** The book's topic ranges per level: A1 = 1–15, A2 = 16–40, B1 = 41–70, B2 = 71–100. */
export const TOPIC_RANGE: Record<Level, [number, number]> = { A1: [1, 15], A2: [16, 40], B1: [41, 70], B2: [71, 100] };

export function levelOfTopic(n: number): Level | null {
  for (const [lvl, [a, b]] of Object.entries(TOPIC_RANGE) as [Level, [number, number]][]) if (n >= a && n <= b) return lvl;
  return null;
}

export const topicCount = (level: Level) => TOPIC_RANGE[level][1] - TOPIC_RANGE[level][0] + 1;
