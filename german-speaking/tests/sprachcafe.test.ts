import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getDb, resetDbForTests, schema } from "@/lib/db";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { localStartEpoch, materializeRecurringSessions } from "@/lib/sprachcafe/service";

const testDatabase = path.join(process.cwd(), "data", "sprachcafe-test.db");
process.env.DATABASE_PATH = testDatabase;
let cookie: string | undefined;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined }) }));
const directoryRoute = await import("@/app/api/sprachcafe/route");
const teachersAdminRoute = await import("@/app/api/admin/sprachcafe/teachers/route");
const bookingRoute = await import("@/app/api/sprachcafe/bookings/route");
const bookingDetailRoute = await import("@/app/api/sprachcafe/bookings/[id]/route");
const joinRoute = await import("@/app/api/sprachcafe/sessions/[id]/join/route");

async function makeUser(role: "admin" | "student") {
  const db = await getDb(), id = randomUUID(), now = Date.now();
  await db.insert(schema.users).values({ id, name: role, username: `${role}-${id.slice(0,8)}`, role, createdAt: now, tokenVersion: 0 }).run();
  return signToken({ u: id, v: 0, e: now + 3_600_000 });
}
const post = (body: unknown) => new Request("http://test/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("Sprachcafé", () => {
  let student: string, secondStudent: string, admin: string, sessionId: string, paidId: string;
  beforeAll(async () => {
    const db = await getDb(), now = Date.now();
    student = await makeUser("student"); secondStudent = await makeUser("student"); admin = await makeUser("admin");
    await db.update(schema.cafeTeachers).set({ privateContact: "private@example.invalid", bookingEnabled: 1, published: 1 }).where((await import("drizzle-orm")).eq(schema.cafeTeachers.id, "farah")).run();
    const session = (id: string, priceMinor: number | null, capacity: number) => ({ id, seriesId: null, occurrenceKey: null, teacherId: "farah", title: "A1 Conversation", description: "", level: "A1", category: "conversation", startsAt: now + 30 * 60_000, timezone: "Africa/Cairo", durationMinutes: 60, capacity, priceMinor, currency: priceMinor === null ? null : "EGP", bookingDeadlineMinutes: 0, cancellationDeadlineMinutes: 0, joinWindowMinutes: 60, meetingUrl: "https://meeting.example.invalid/secret", meetingInstructions: "Use the private link", status: "scheduled", published: 1, createdAt: now, updatedAt: now });
    sessionId = randomUUID(); paidId = randomUUID();
    await db.insert(schema.cafeSessions).values([session(sessionId, null, 1), session(paidId, 15000, 4)]).run();
  });
  afterAll(() => { resetDbForTests(); });

  it("seeds only the two requested teacher profiles and never returns private contact in public data", async () => {
    cookie = admin;
    const managed = await teachersAdminRoute.GET(), managedBody = await managed.json();
    expect(managedBody.teachers.map((t: { id: string }) => t.id)).toContain("farah");
    expect(managedBody.teachers.map((t: { id: string }) => t.id)).toContain("omar-helmy");
    expect(managedBody.teachers.find((t: { id: string }) => t.id === "farah").privateContact).toBe("private@example.invalid");
    cookie = student;
    const response = await directoryRoute.GET(new Request("http://test/api/sprachcafe")), body = await response.json();
    expect(body.teachers.map((t: { id: string }) => t.id)).toContain("farah");
    expect(JSON.stringify(body)).not.toContain("private@example.invalid");
    expect(JSON.stringify(body)).not.toContain("meeting.example.invalid");
  });

  it("enforces free booking, capacity, duplicate prevention, cancellation, and rebooking", async () => {
    cookie = student;
    const created = await bookingRoute.POST(post({ sessionId }));
    expect(created.status).toBe(201);
    expect((await bookingRoute.POST(post({ sessionId }))).status).toBe(409);
    cookie = secondStudent;
    expect((await bookingRoute.POST(post({ sessionId }))).status).toBe(409);
    cookie = student;
    const bookings = await (await bookingRoute.GET()).json();
    expect(bookings.bookings[0].session.id).toBe(sessionId);
    const canceled = await bookingDetailRoute.DELETE(new Request("http://test"), { params: Promise.resolve({ id: (await created.json()).bookingId }) });
    expect(canceled.status).toBe(200);
    cookie = secondStudent;
    expect((await bookingRoute.POST(post({ sessionId }))).status).toBe(201);
  });

  it("keeps paid booking disabled and reveals a meeting link only to a confirmed attendee in the join window", async () => {
    cookie = student;
    expect((await bookingRoute.POST(post({ sessionId: paidId }))).status).toBe(409);
    cookie = secondStudent;
    const publicResponse = await joinRoute.GET(new Request("http://test"), { params: Promise.resolve({ id: paidId }) });
    expect(publicResponse.status).toBe(403);
    const authorizedResponse = await joinRoute.GET(new Request("http://test"), { params: Promise.resolve({ id: sessionId }) });
    expect(authorizedResponse.status).toBe(200);
    expect((await authorizedResponse.json()).meetingUrl).toContain("secret");
    const db = await getDb(), row = await db.select().from(schema.cafeSessions).where((await import("drizzle-orm")).eq(schema.cafeSessions.id, sessionId)).get();
    expect(row?.meetingUrl).toContain("secret");
  });

  it("rejects admin management from a learner and creates timezone-correct, idempotent weekly occurrences", async () => {
    cookie = student;
    expect((await teachersAdminRoute.POST(post({ displayNameAr: "Another" }))).status).toBe(403);
    const start = localStartEpoch("2026-11-01", 18 * 60, "Africa/Cairo");
    expect(start).not.toBeNull();
    expect(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start!)).toBe("18:00");
    const db = await getDb(), now = Date.now(), id = randomUUID();
    const next = new Date(now + 2 * 86_400_000).toISOString().slice(0, 10), weekday = new Date(`${next}T00:00:00Z`).getUTCDay();
    await db.insert(schema.cafeSeries).values({ id, teacherId: "farah", title: "Weekly conversation", description: "", level: "A1", category: "conversation", weekday, startMinute: 18 * 60, timezone: "Africa/Cairo", durationMinutes: 60, capacity: 8, priceMinor: null, currency: null, bookingDeadlineMinutes: 60, cancellationDeadlineMinutes: 1440, joinWindowMinutes: 15, startDate: next, endDate: next, published: 0, meetingUrl: null, meetingInstructions: "", status: "active", createdAt: now, updatedAt: now }).run();
    await materializeRecurringSessions(db, now); await materializeRecurringSessions(db, now);
    const occurrences = await db.select().from(schema.cafeSessions).where((await import("drizzle-orm")).eq(schema.cafeSessions.seriesId, id)).all();
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].published).toBe(0);
  });
});
