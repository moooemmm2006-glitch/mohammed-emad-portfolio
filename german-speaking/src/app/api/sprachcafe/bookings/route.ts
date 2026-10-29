import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser(); if (!user) return unauthorized();
  const db = await getDb(), now = Date.now();
  const bookings = await db.select().from(schema.cafeBookings).where(eq(schema.cafeBookings.userId, user.id)).orderBy(desc(schema.cafeBookings.bookedAt)).limit(200).all();
  const ids = [...new Set(bookings.map((b) => b.sessionId))];
  const sessions = ids.length ? await db.select().from(schema.cafeSessions).where(inArray(schema.cafeSessions.id, ids)).all() : [];
  const teacherIds = [...new Set(sessions.map((s) => s.teacherId))];
  const teachers = teacherIds.length ? await db.select().from(schema.cafeTeachers).where(inArray(schema.cafeTeachers.id, teacherIds)).all() : [];
  const sessionMap = new Map(sessions.map((s) => [s.id, s])), teacherMap = new Map(teachers.map((t) => [t.id, t]));
  return NextResponse.json({ bookings: bookings.flatMap((booking) => {
    const session = sessionMap.get(booking.sessionId), teacher = session && teacherMap.get(session.teacherId); if (!session || !teacher) return [];
    const joinOpen = session.startsAt - session.joinWindowMinutes * 60_000 <= now && now <= session.startsAt + session.durationMinutes * 60_000;
    const canCancel = booking.status === "booked" && (session.status === "cancelled" || now < session.startsAt - session.cancellationDeadlineMinutes * 60_000);
    return [{ id: booking.id, status: booking.status, paymentStatus: booking.paymentStatus, bookedAt: booking.bookedAt,
      session: { id: session.id, title: session.title, description: session.description, teacher: { id: teacher.id, name: teacher.displayNameAr, photoUrl: teacher.photoUrl }, level: session.level, category: session.category, startsAt: session.startsAt, timezone: session.timezone, durationMinutes: session.durationMinutes, capacity: session.capacity, priceMinor: session.priceMinor, isFree: session.priceMinor === null || session.priceMinor === 0, status: session.status, cancellationNote: session.cancellationNote },
      canCancel, canJoin: booking.status === "booked" && ["scheduled", "rescheduled"].includes(session.status) && joinOpen, meetingInstructions: joinOpen && booking.status === "booked" ? session.meetingInstructions : "" }];
  }) });
}

const Body = z.object({ sessionId: z.string().min(1).max(200) });
export async function POST(req: Request) {
  const user = await currentUser(); if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req)); if (!parsed.success) return jsonError(400, "invalid_booking", "Choose a valid session.");
  const db = await getDb(), now = Date.now();
  try {
    const result = await db.transaction(async (tx) => {
      const session = await tx.select().from(schema.cafeSessions).where(eq(schema.cafeSessions.id, parsed.data.sessionId)).get();
      if (!session || !["scheduled", "rescheduled"].includes(session.status) || !session.published) return "unavailable" as const;
      const teacher = await tx.select().from(schema.cafeTeachers).where(eq(schema.cafeTeachers.id, session.teacherId)).get();
      if (!teacher || !teacher.bookingEnabled) return "booking_disabled" as const;
      if (session.priceMinor !== null && session.priceMinor > 0) return "payment_unavailable" as const;
      if (now >= session.startsAt - session.bookingDeadlineMinutes * 60_000 || session.startsAt <= now) return "booking_closed" as const;
      const existing = await tx.select().from(schema.cafeBookings).where(and(eq(schema.cafeBookings.sessionId, session.id), eq(schema.cafeBookings.userId, user.id))).get();
      if (existing?.status === "booked") return "already_booked" as const;
      const seats = await tx.select().from(schema.cafeBookings).where(and(eq(schema.cafeBookings.sessionId, session.id), eq(schema.cafeBookings.status, "booked"))).all();
      if (seats.length >= session.capacity) return "full" as const;
      const id = existing?.id ?? randomUUID();
      await tx.insert(schema.cafeBookings).values({ id, sessionId: session.id, userId: user.id, status: "booked", paymentStatus: "not_required", bookedAt: now, cancelledAt: null, updatedAt: now }).onConflictDoUpdate({ target: [schema.cafeBookings.userId, schema.cafeBookings.sessionId], set: { status: "booked", paymentStatus: "not_required", bookedAt: now, cancelledAt: null, updatedAt: now } }).run();
      return { id };
    });
    if (result === "unavailable") return jsonError(404, "session_unavailable", "This session is not available.");
    if (result === "booking_disabled") return jsonError(409, "booking_disabled", "Booking is not enabled for this teacher yet.");
    if (result === "payment_unavailable") return jsonError(409, "payment_unavailable", "Payment is not configured yet. Paid sessions cannot be booked.");
    if (result === "booking_closed") return jsonError(409, "booking_closed", "Booking for this session is closed.");
    if (result === "already_booked") return jsonError(409, "already_booked", "You already have a reservation for this session.");
    if (result === "full") return jsonError(409, "session_full", "This session has no seats left.");
    return NextResponse.json({ bookingId: result.id, status: "booked" }, { status: 201 });
  } catch (error) {
    if (/busy|locked|transaction/i.test(String(error))) return jsonError(409, "booking_conflict", "Seats changed while booking. Refresh and try again.");
    throw error;
  }
}
