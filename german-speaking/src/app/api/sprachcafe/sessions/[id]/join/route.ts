import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return unauthorized();
  const { id } = await params, db = await getDb(), now = Date.now();
  const session = await db.select().from(schema.cafeSessions).where(eq(schema.cafeSessions.id, id)).get();
  if (!session || !session.published) return jsonError(404, "not_found", "Session not found.");
  const booking = await db.select().from(schema.cafeBookings).where(and(eq(schema.cafeBookings.sessionId, id), eq(schema.cafeBookings.userId, user.id), eq(schema.cafeBookings.status, "booked"))).get();
  if (!booking && user.role !== "admin") return forbidden();
  if (session.status === "cancelled") return jsonError(410, "session_cancelled", session.cancellationNote || "This session was cancelled.");
  if (!["scheduled", "rescheduled"].includes(session.status)) return jsonError(410, "session_ended", "This session is no longer available.");
  const joinOpensAt = session.startsAt - session.joinWindowMinutes * 60_000, endsAt = session.startsAt + session.durationMinutes * 60_000;
  if (now < joinOpensAt) return NextResponse.json({ status: "waiting", startsAt: session.startsAt, joinOpensAt, endsAt, title: session.title, timezone: session.timezone, durationMinutes: session.durationMinutes, meetingInstructions: session.meetingInstructions });
  if (now > endsAt) return jsonError(410, "session_ended", "This session has ended.");
  return NextResponse.json({ status: "live", startsAt: session.startsAt, joinOpensAt, endsAt, title: session.title, timezone: session.timezone, durationMinutes: session.durationMinutes, meetingUrl: session.meetingUrl, meetingInstructions: session.meetingInstructions, mediaConfigured: false });
}
