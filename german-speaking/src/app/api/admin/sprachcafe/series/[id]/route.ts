import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { CAFE_CATEGORIES, CAFE_LEVELS, localStartEpoch, materializeRecurringSessions } from "@/lib/sprachcafe/service";
export const runtime = "nodejs";
const Edit = z.object({ teacherId: z.string().min(1).optional(), title: z.string().trim().min(3).max(120).optional(), description: z.string().trim().max(2000).optional(), level: z.enum(CAFE_LEVELS).optional(), category: z.enum(CAFE_CATEGORIES).optional(), weekday: z.number().int().min(0).max(6).optional(), startMinute: z.number().int().min(0).max(1439).optional(), timezone: z.string().min(1).max(80).optional(), durationMinutes: z.number().int().min(10).max(240).optional(), capacity: z.number().int().min(1).max(100).optional(), priceMinor: z.number().int().min(0).nullable().optional(), currency: z.string().length(3).nullable().optional(), bookingDeadlineMinutes: z.number().int().min(0).max(10080).optional(), cancellationDeadlineMinutes: z.number().int().min(0).max(10080).optional(), joinWindowMinutes: z.number().int().min(0).max(120).optional(), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), meetingUrl: z.string().url().max(1000).refine((v)=>v.startsWith("https://")).nullable().optional(), meetingInstructions: z.string().trim().max(1000).optional(), published: z.boolean().optional(), status: z.enum(["active", "cancelled"]).optional() });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return unauthorized(); if (user.role !== "admin") return forbidden();
  const parsed = Edit.safeParse(await readJson(req)); if (!parsed.success || !Object.keys(parsed.data).length) return jsonError(400, "invalid_series", "Check the weekly schedule details.");
  const { id } = await params, db = await getDb(), rule = await db.select().from(schema.cafeSeries).where(eq(schema.cafeSeries.id, id)).get(); if (!rule) return jsonError(404, "not_found", "Weekly schedule not found.");
  const d = parsed.data, values = { ...d, published: d.published === undefined ? undefined : Number(d.published), updatedAt: Date.now() };
  const timezone = d.timezone ?? rule.timezone; try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { return jsonError(400, "invalid_timezone", "Choose a valid time zone."); }
  const startDate = d.startDate ?? rule.startDate, endDate = d.endDate === undefined ? rule.endDate : d.endDate;
  if (endDate && endDate < startDate) return jsonError(400, "invalid_date_range", "The end date must follow the start date.");
  if (d.teacherId && !await db.select().from(schema.cafeTeachers).where(eq(schema.cafeTeachers.id, d.teacherId)).get()) return jsonError(400, "invalid_teacher", "Choose an existing teacher.");
  if (d.status === "cancelled") {
    await db.transaction(async (tx) => {
      await tx.update(schema.cafeSeries).set({ ...values, published: 0 }).where(eq(schema.cafeSeries.id, id)).run();
      await tx.update(schema.cafeSessions).set({ status: "cancelled", published: 0, cancellationNote: "This recurring schedule was cancelled.", updatedAt: Date.now() }).where(and(eq(schema.cafeSessions.seriesId, id), eq(schema.cafeSessions.status, "scheduled"), gt(schema.cafeSessions.startsAt, Date.now()))).run();
    });
    return NextResponse.json({ ok: true });
  }
  await db.update(schema.cafeSeries).set(values).where(eq(schema.cafeSeries.id, id)).run();
  const future = await db.select().from(schema.cafeSessions).where(and(eq(schema.cafeSessions.seriesId, id), eq(schema.cafeSessions.status, "scheduled"), gt(schema.cafeSessions.startsAt, Date.now()))).all();
  const latest = await db.select().from(schema.cafeSeries).where(eq(schema.cafeSeries.id, id)).get();
  if (latest) for (const session of future) {
    const reserved = await db.select().from(schema.cafeBookings).where(and(eq(schema.cafeBookings.sessionId, session.id), eq(schema.cafeBookings.status, "booked"))).all();
    if (reserved.length) continue;
    const occurrenceDate = session.occurrenceKey?.split("@")[0];
    if (!occurrenceDate || occurrenceDate < latest.startDate || (latest.endDate && occurrenceDate > latest.endDate) || new Date(`${occurrenceDate}T00:00:00Z`).getUTCDay() !== latest.weekday) {
      await db.update(schema.cafeSessions).set({ status: "cancelled", published: 0, cancellationNote: "The recurring schedule changed.", updatedAt: Date.now() }).where(eq(schema.cafeSessions.id, session.id)).run();
      continue;
    }
    const startsAt = localStartEpoch(occurrenceDate, latest.startMinute, latest.timezone); if (startsAt === null) continue;
    await db.update(schema.cafeSessions).set({ teacherId: latest.teacherId, title: latest.title, description: latest.description, level: latest.level, category: latest.category, startsAt, timezone: latest.timezone, durationMinutes: latest.durationMinutes, capacity: latest.capacity, priceMinor: latest.priceMinor, currency: latest.currency, bookingDeadlineMinutes: latest.bookingDeadlineMinutes, cancellationDeadlineMinutes: latest.cancellationDeadlineMinutes, joinWindowMinutes: latest.joinWindowMinutes, meetingUrl: latest.meetingUrl, meetingInstructions: latest.meetingInstructions, published: latest.published, occurrenceKey: `${occurrenceDate}@${latest.startMinute}`, updatedAt: Date.now() }).where(eq(schema.cafeSessions.id, session.id)).run();
  }
  await materializeRecurringSessions(db);
  return NextResponse.json({ ok: true });
}
