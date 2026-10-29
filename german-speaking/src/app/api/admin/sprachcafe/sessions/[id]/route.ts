import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
export const runtime = "nodejs";
const Edit = z.object({ teacherId: z.string().min(1).optional(), title: z.string().trim().min(3).max(120).optional(), description: z.string().trim().max(2000).optional(), level: z.enum(["A1", "A2", "B1", "B2"]).optional(), category: z.enum(["conversation", "speaking", "pronunciation", "vocabulary", "grammar", "exam", "open"]).optional(), startsAt: z.number().int().positive().optional(), timezone: z.string().min(1).max(80).optional(), capacity: z.number().int().min(1).max(100).optional(), durationMinutes: z.number().int().min(10).max(240).optional(), priceMinor: z.number().int().min(0).nullable().optional(), currency: z.string().length(3).nullable().optional(), published: z.boolean().optional(), status: z.enum(["scheduled", "cancelled", "completed", "rescheduled"]).optional(), cancellationNote: z.string().trim().max(1000).optional(), meetingUrl: z.string().url().max(1000).refine((v)=>v.startsWith("https://")).nullable().optional(), meetingInstructions: z.string().trim().max(1000).optional() });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return unauthorized(); if (user.role !== "admin") return forbidden();
  const parsed = Edit.safeParse(await readJson(req)); if (!parsed.success || !Object.keys(parsed.data).length) return jsonError(400, "invalid_session", "Check the session details.");
  const { id } = await params, db = await getDb(), old = await db.select().from(schema.cafeSessions).where(eq(schema.cafeSessions.id, id)).get();
  if (!old) return jsonError(404, "not_found", "Session not found.");
  const d = parsed.data; if (d.startsAt !== undefined && d.startsAt <= Date.now() && old.startsAt > Date.now()) return jsonError(400, "invalid_time", "A future session cannot be moved into the past.");
  if (d.teacherId && !await db.select().from(schema.cafeTeachers).where(eq(schema.cafeTeachers.id, d.teacherId)).get()) return jsonError(400, "invalid_teacher", "Choose an existing teacher.");
  if (d.timezone) { try { new Intl.DateTimeFormat("en", { timeZone: d.timezone }); } catch { return jsonError(400, "invalid_timezone", "Choose a valid time zone."); } }
  if (d.capacity !== undefined) { const bookings = await db.select().from(schema.cafeBookings).where(eq(schema.cafeBookings.sessionId, id)).all(); if (d.capacity < bookings.filter((b) => b.status === "booked").length) return jsonError(409, "capacity_too_low", "Capacity cannot be less than current reservations."); }
  await db.update(schema.cafeSessions).set({ ...d, published: d.published === undefined ? undefined : Number(d.published), updatedAt: Date.now() }).where(eq(schema.cafeSessions.id, id)).run();
  return NextResponse.json({ ok: true });
}
