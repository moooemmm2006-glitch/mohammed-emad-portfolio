import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Teacher = z.object({ displayNameAr: z.string().trim().min(1).max(80), displayNameEn: z.string().trim().max(80).default(""), photoUrl: z.string().trim().max(500).default(""), biography: z.string().trim().max(1200).default(""), languages: z.array(z.string().trim().min(1).max(60)).max(12).default([]), proficiency: z.string().trim().max(100).default(""), specializations: z.array(z.string().trim().min(1).max(80)).max(20).default([]), levels: z.array(z.enum(["A1", "A2", "B1", "B2"])).max(4).default([]), sessionTypes: z.array(z.string().trim().min(1).max(80)).max(20).default([]), availability: z.array(z.string().trim().min(1).max(160)).max(40).default([]), durationMinutes: z.number().int().min(5).max(240).nullable().default(null), priceMinor: z.number().int().min(0).nullable().default(null), currency: z.string().trim().length(3).nullable().default(null), privateContact: z.string().trim().max(500).default(""), bookingEnabled: z.boolean().default(false), published: z.boolean().default(false) });
async function admin() { const user = await currentUser(); return !user ? unauthorized() : user.role !== "admin" ? forbidden() : null; }
export async function GET() {
  const denied = await admin(); if (denied) return denied;
  const db = await getDb(), teachers = await db.select().from(schema.cafeTeachers).all();
  return NextResponse.json({ teachers: teachers.map((t) => ({ ...t, languages: JSON.parse(t.languagesJson), specializations: JSON.parse(t.specializationsJson), levels: JSON.parse(t.levelsJson), sessionTypes: JSON.parse(t.sessionTypesJson), availability: JSON.parse(t.availabilityJson), bookingEnabled: Boolean(t.bookingEnabled), published: Boolean(t.published) })) });
}
export async function POST(req: Request) {
  const denied = await admin(); if (denied) return denied;
  const parsed = Teacher.safeParse(await readJson(req)); if (!parsed.success) return jsonError(400, "invalid_teacher", "Check the teacher details.");
  const d = parsed.data, now = Date.now(), id = randomUUID(), db = await getDb();
  await db.insert(schema.cafeTeachers).values({ id, displayNameAr: d.displayNameAr, displayNameEn: d.displayNameEn || null, photoUrl: d.photoUrl || null, biography: d.biography, languagesJson: JSON.stringify(d.languages), proficiency: d.proficiency || null, specializationsJson: JSON.stringify(d.specializations), levelsJson: JSON.stringify(d.levels), sessionTypesJson: JSON.stringify(d.sessionTypes), availabilityJson: JSON.stringify(d.availability), durationMinutes: d.durationMinutes, priceMinor: d.priceMinor, currency: d.currency, privateContact: d.privateContact || null, bookingEnabled: Number(d.bookingEnabled), published: Number(d.published), createdAt: now, updatedAt: now }).run();
  return NextResponse.json({ id }, { status: 201 });
}
