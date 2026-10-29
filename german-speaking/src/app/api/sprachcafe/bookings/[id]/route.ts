import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError } from "@/lib/api";
export const runtime = "nodejs";
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return unauthorized();
  const { id } = await params, db = await getDb(), now = Date.now();
  const booking = await db.select().from(schema.cafeBookings).where(and(eq(schema.cafeBookings.id, id), eq(schema.cafeBookings.userId, user.id))).get();
  if (!booking || booking.status !== "booked") return jsonError(404, "booking_not_found", "Active booking not found.");
  const session = await db.select().from(schema.cafeSessions).where(eq(schema.cafeSessions.id, booking.sessionId)).get();
  if (!session) return jsonError(404, "session_not_found", "Session not found.");
  if (session.status !== "cancelled" && now >= session.startsAt - session.cancellationDeadlineMinutes * 60_000) return jsonError(409, "cancellation_closed", "The cancellation deadline has passed.");
  await db.update(schema.cafeBookings).set({ status: "cancelled", cancelledAt: now, updatedAt: now }).where(and(eq(schema.cafeBookings.id, id), eq(schema.cafeBookings.status, "booked"))).run();
  return NextResponse.json({ status: "cancelled" });
}
