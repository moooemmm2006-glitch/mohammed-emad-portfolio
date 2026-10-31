import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { bookingCounts, publicSession, publicTeacher } from "@/lib/sprachcafe/service";
import { teacherRatings } from "@/lib/sprachcafe/reviews";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return unauthorized();
  const { id } = await params, db = await getDb(), now = Date.now();
  const teacher = await db.select().from(schema.cafeTeachers).where(and(eq(schema.cafeTeachers.id, id), eq(schema.cafeTeachers.published, 1))).get();
  if (!teacher) return NextResponse.json({ error: { code: "not_found", message: "Teacher not found" } }, { status: 404 });
  const rows = await db.select().from(schema.cafeSessions).where(and(eq(schema.cafeSessions.teacherId, id), eq(schema.cafeSessions.published, 1), inArray(schema.cafeSessions.status, ["scheduled", "rescheduled"]), gt(schema.cafeSessions.startsAt, now - 4 * 3_600_000))).orderBy(asc(schema.cafeSessions.startsAt)).limit(80).all();
  const upcoming = rows.filter((row) => row.startsAt + row.durationMinutes * 60_000 > now);
  const counts = await bookingCounts(db, upcoming.map((row) => row.id));
  const rating = (await teacherRatings([id])).get(id)!;
  return NextResponse.json({ teacher: { ...publicTeacher(teacher, upcoming.length), rating }, sessions: upcoming.map((row) => publicSession(row, { id, name: teacher.displayNameAr, photoUrl: teacher.photoUrl, bookingEnabled: Boolean(teacher.bookingEnabled) }, counts.get(row.id) ?? 0)) });
}
