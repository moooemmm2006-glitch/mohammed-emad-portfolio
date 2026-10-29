import { and, eq, lte } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { schema } from "@/lib/db";

export const CAFE_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export const CAFE_CATEGORIES = ["conversation", "speaking", "pronunciation", "vocabulary", "grammar", "exam", "open"] as const;
export const CAFE_PRESENCE_WINDOW_MINUTES = 15;
export const CAFE_GENERATE_DAYS = 60;

export function parseJsonList(value: string | null | undefined): string[] {
  try { const parsed: unknown = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; }
  catch { return []; }
}

export function publicTeacher(row: typeof schema.cafeTeachers.$inferSelect, sessionCount = 0) {
  return {
    id: row.id, displayNameAr: row.displayNameAr, displayNameEn: row.displayNameEn, photoUrl: row.photoUrl, biography: row.biography,
    languages: parseJsonList(row.languagesJson), proficiency: row.proficiency, specializations: parseJsonList(row.specializationsJson),
    levels: parseJsonList(row.levelsJson), sessionTypes: parseJsonList(row.sessionTypesJson), availability: parseJsonList(row.availabilityJson),
    durationMinutes: row.durationMinutes, priceMinor: row.priceMinor, currency: row.currency, bookingEnabled: Boolean(row.bookingEnabled),
    published: Boolean(row.published), upcomingSessions: sessionCount,
  };
}

export function dateKeyAddDays(key: string, amount: number) {
  const date = new Date(`${key}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10);
}

function zonedParts(epoch: number, timezone: string) {
  const values = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(epoch);
  const get = (key: string) => Number(values.find((part) => part.type === key)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** Convert a wall-clock occurrence to UTC, rejecting local times skipped by a DST change. */
export function localStartEpoch(date: string, minute: number, timezone: string): number | null {
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(minute / 60), mins = minute % 60;
  const desired = Date.UTC(year, month - 1, day, hour, mins);
  let candidate = desired;
  try {
    for (let i = 0; i < 3; i++) {
      const local = zonedParts(candidate, timezone);
      const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
      candidate += desired - asUtc;
    }
    const check = zonedParts(candidate, timezone);
    if (check.year !== year || check.month !== month || check.day !== day || check.hour !== hour || check.minute !== mins) return null;
    return candidate;
  } catch { return null; }
}

export async function materializeRecurringSessions(db: DB, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const through = dateKeyAddDays(today, CAFE_GENERATE_DAYS);
  const series = await db.select().from(schema.cafeSeries).where(and(eq(schema.cafeSeries.status, "active"), lte(schema.cafeSeries.startDate, through))).all();
  for (const rule of series) {
    const start = rule.startDate > today ? rule.startDate : today;
    const last = rule.endDate && rule.endDate < through ? rule.endDate : through;
    for (let day = start; day <= last; day = dateKeyAddDays(day, 1)) {
      if (new Date(`${day}T00:00:00.000Z`).getUTCDay() !== rule.weekday) continue;
      const startsAt = localStartEpoch(day, rule.startMinute, rule.timezone);
      if (startsAt === null || startsAt <= now - rule.durationMinutes * 60_000) continue;
      const occurrenceKey = `${day}@${rule.startMinute}`;
      await db.insert(schema.cafeSessions).values({
        id: `${rule.id}:${day}`, seriesId: rule.id, occurrenceKey, teacherId: rule.teacherId, title: rule.title, description: rule.description,
        level: rule.level, category: rule.category, startsAt, timezone: rule.timezone, durationMinutes: rule.durationMinutes, capacity: rule.capacity,
        priceMinor: rule.priceMinor, currency: rule.currency, bookingDeadlineMinutes: rule.bookingDeadlineMinutes, cancellationDeadlineMinutes: rule.cancellationDeadlineMinutes,
        joinWindowMinutes: rule.joinWindowMinutes, meetingUrl: rule.meetingUrl, meetingInstructions: rule.meetingInstructions,
        status: "scheduled", published: rule.published, createdAt: now, updatedAt: now,
      }).onConflictDoNothing().run();
    }
  }
}

export async function bookingCounts(db: DB, sessionIds: string[]) {
  const counts = new Map<string, number>();
  for (const id of sessionIds) {
    const rows = await db.select().from(schema.cafeBookings).where(and(eq(schema.cafeBookings.sessionId, id), eq(schema.cafeBookings.status, "booked"))).all();
    counts.set(id, rows.length);
  }
  return counts;
}

export function publicSession(row: typeof schema.cafeSessions.$inferSelect, teacher: { id: string; name: string; photoUrl: string | null; bookingEnabled: boolean }, bookingCount: number) {
  return {
    id: row.id, title: row.title, description: row.description, teacher, level: row.level, category: row.category, startsAt: row.startsAt,
    timezone: row.timezone, durationMinutes: row.durationMinutes, capacity: row.capacity, bookingCount, isFree: row.priceMinor === null || row.priceMinor === 0,
    priceMinor: row.priceMinor, currency: row.currency, bookingDeadlineAt: row.startsAt - row.bookingDeadlineMinutes * 60_000,
    cancellationDeadlineAt: row.startsAt - row.cancellationDeadlineMinutes * 60_000, joinOpensAt: row.startsAt - row.joinWindowMinutes * 60_000,
    status: row.status, cancellationNote: row.cancellationNote, bookingAvailable: teacher.bookingEnabled && ["scheduled", "rescheduled"].includes(row.status) && row.published === 1 && (row.priceMinor === null || row.priceMinor === 0),
  };
}
