import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { bookingCounts, publicSession } from "@/lib/sprachcafe/service";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return unauthorized();
  const { id } = await params, db = await getDb(), row = await db.select().from(schema.cafeSessions).where(and(eq(schema.cafeSessions.id, id), eq(schema.cafeSessions.published, 1), inArray(schema.cafeSessions.status,["scheduled","rescheduled"]))).get();
  if (!row) return NextResponse.json({ error: { code: "not_found", message: "Session not found" } }, { status: 404 });
  const teacher = await db.select().from(schema.cafeTeachers).where(and(eq(schema.cafeTeachers.id, row.teacherId), eq(schema.cafeTeachers.published, 1))).get();
  if (!teacher) return NextResponse.json({ error: { code: "not_found", message: "Session not found" } }, { status: 404 });
  const counts = await bookingCounts(db, [id]);
  return NextResponse.json({ session: publicSession(row, { id: teacher.id, name: teacher.displayNameAr, photoUrl: teacher.photoUrl, bookingEnabled: Boolean(teacher.bookingEnabled) }, counts.get(id) ?? 0) });
}
