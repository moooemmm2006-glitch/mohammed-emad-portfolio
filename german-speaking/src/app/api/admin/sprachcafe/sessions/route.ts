import { asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { CAFE_CATEGORIES, CAFE_LEVELS, bookingCounts, materializeRecurringSessions } from "@/lib/sprachcafe/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Session = z.object({ teacherId: z.string().min(1), title: z.string().trim().min(3).max(120), description: z.string().trim().max(2000).default(""), level: z.enum(CAFE_LEVELS), category: z.enum(CAFE_CATEGORIES), startsAt: z.number().int().positive(), timezone: z.string().min(1).max(80), durationMinutes: z.number().int().min(10).max(240), capacity: z.number().int().min(1).max(100), priceMinor: z.number().int().min(0).nullable().default(null), currency: z.string().length(3).nullable().default(null), bookingDeadlineMinutes: z.number().int().min(0).max(10080).default(60), cancellationDeadlineMinutes: z.number().int().min(0).max(10080).default(1440), joinWindowMinutes: z.number().int().min(0).max(120).default(15), meetingUrl: z.string().url().max(1000).refine((v)=>v.startsWith("https://")).nullable().default(null), meetingInstructions: z.string().trim().max(1000).default(""), published: z.boolean().default(false) });
export async function GET() {
  const user = await currentUser(); if (!user) return unauthorized(); if (user.role !== "admin") return forbidden();
  const db = await getDb(); await materializeRecurringSessions(db);
  const [sessions, teachers] = await Promise.all([db.select().from(schema.cafeSessions).orderBy(asc(schema.cafeSessions.startsAt)).limit(300).all(), db.select().from(schema.cafeTeachers).all()]);
  const counts = await bookingCounts(db, sessions.map((s) => s.id)), teacherMap = new Map(teachers.map((t) => [t.id, t]));
  return NextResponse.json({ sessions: sessions.map((s) => ({ ...s, isFree: s.priceMinor === null || s.priceMinor === 0, bookingCount: counts.get(s.id) ?? 0, teacherName: teacherMap.get(s.teacherId)?.displayNameAr ?? "—" })) });
}
export async function POST(req: Request) {
  const user = await currentUser(); if (!user) return unauthorized(); if (user.role !== "admin") return forbidden();
  const parsed = Session.safeParse(await readJson(req)); if (!parsed.success) return jsonError(400, "invalid_session", "Check the session details.");
  const d = parsed.data; try { new Intl.DateTimeFormat("en", { timeZone: d.timezone }); } catch { return jsonError(400, "invalid_timezone", "Choose a valid time zone."); }
  const db = await getDb(), teacher = await db.select().from(schema.cafeTeachers).where(eq(schema.cafeTeachers.id, d.teacherId)).get();
  if (!teacher) return jsonError(400, "invalid_teacher", "Choose an existing teacher.");
  if (d.startsAt <= Date.now()) return jsonError(400, "invalid_time", "The session must start in the future.");
  if (d.priceMinor !== null && d.priceMinor > 0 && !d.currency) return jsonError(400, "currency_required", "Choose a currency for a paid session.");
  const now = Date.now(), id = randomUUID();
  await db.insert(schema.cafeSessions).values({ id, seriesId: null, occurrenceKey: null, ...d, published: Number(d.published), status: "scheduled", createdAt: now, updatedAt: now }).run();
  return NextResponse.json({ id }, { status: 201 });
}
