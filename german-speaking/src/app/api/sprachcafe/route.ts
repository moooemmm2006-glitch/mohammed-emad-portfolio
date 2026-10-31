import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { bookingCounts, materializeRecurringSessions, publicSession, publicTeacher } from "@/lib/sprachcafe/service";
import { teacherRatings } from "@/lib/sprachcafe/reviews";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await currentUser(); if (!user) return unauthorized();
  const db = await getDb(), now = Date.now(); await materializeRecurringSessions(db, now);
  const params = new URL(req.url).searchParams, level = params.get("level"), teacherId = params.get("teacher"), category = params.get("category"), free = params.get("free");
  const teacherRows = await db.select().from(schema.cafeTeachers).where(eq(schema.cafeTeachers.published, 1)).all();
  const teacherMap = new Map(teacherRows.map((t) => [t.id, t]));
  const predicates = [eq(schema.cafeSessions.published, 1), inArray(schema.cafeSessions.status, ["scheduled", "rescheduled"]), gt(schema.cafeSessions.startsAt, now - 4 * 3_600_000)];
  if (level && ["A1", "A2", "B1", "B2"].includes(level)) predicates.push(eq(schema.cafeSessions.level, level));
  if (teacherId) predicates.push(eq(schema.cafeSessions.teacherId, teacherId));
  if (category) predicates.push(eq(schema.cafeSessions.category, category));
  const rows = await db.select().from(schema.cafeSessions).where(and(...predicates)).orderBy(asc(schema.cafeSessions.startsAt)).limit(120).all();
  const filtered = rows.filter((row) => row.startsAt + row.durationMinutes * 60_000 > now && teacherMap.has(row.teacherId) && (free !== "true" || row.priceMinor === null || row.priceMinor === 0));
  const counts = await bookingCounts(db, filtered.map((row) => row.id));
  const sessions = filtered.map((row) => {
    const teacher = teacherMap.get(row.teacherId)!;
    return publicSession(row, { id: teacher.id, name: teacher.displayNameAr, photoUrl: teacher.photoUrl, bookingEnabled: Boolean(teacher.bookingEnabled) }, counts.get(row.id) ?? 0);
  });
  const sessionCounts = new Map<string, number>(); for (const session of sessions) sessionCounts.set(session.teacher.id, (sessionCounts.get(session.teacher.id) ?? 0) + 1);
  const ratings = await teacherRatings(teacherRows.map((t) => t.id));
  const teachers = teacherRows.map((teacher) => ({ ...publicTeacher(teacher, sessionCounts.get(teacher.id) ?? 0), rating: ratings.get(teacher.id) ?? { average: null, count: 0 } }));
  const featured = sessions[0] ?? null;
  return NextResponse.json({ teachers, sessions, featured, now, paymentsEnabled: false, liveMediaEnabled: false });
}
