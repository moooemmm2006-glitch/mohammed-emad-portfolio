export const READING_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export const isReadingLevel = (value: unknown): value is ReadingLevel =>
  typeof value === "string" && (READING_LEVELS as readonly string[]).includes(value);

export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function shiftDay(day: string, amount: number): string {
  const date = new Date(day + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function readingStreak(days: readonly string[], today: string): number {
  const completed = new Set(days);
  let cursor = completed.has(today) ? today : shiftDay(today, -1);
  let count = 0;
  while (completed.has(cursor)) {
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

export function readingWeek(days: readonly string[], today: string): boolean[] {
  const completed = new Set(days);
  return Array.from({ length: 7 }, (_, i) => completed.has(shiftDay(today, i - 6)));
}

export function readingFinishDate(totalPages: number | null, currentPage: number, today: string): string | null {
  if (totalPages === null || totalPages <= 0) return null;
  return shiftDay(today, Math.max(0, totalPages - currentPage));
}

export function readingProgressBonus(currentPage: number, totalPages: number | null): number {
  if (currentPage <= 0) return 0;
  const goal = totalPages && totalPages > 0 ? totalPages : 20;
  return Math.min(20, Math.round((Math.min(currentPage, goal) / goal) * 20));
}
