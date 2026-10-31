import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getDb, resetDbForTests, schema } from "@/lib/db";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";

// ⭐ Sprachcafé reviews: only learners who attended (booked, not cancelled) can review, after the session,
// once; the average shows on the teacher; only the admin can delete a review.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-reviews-"));
process.env.DATABASE_PATH = path.join(dir, "reviews.db");
let cookie: string | undefined;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }) }));
const reviews = await import("@/app/api/sprachcafe/reviews/route");
const directory = await import("@/app/api/sprachcafe/route");
const bookings = await import("@/app/api/sprachcafe/bookings/route");

async function makeUser(name: string, role: "admin" | "student" = "student") {
  const db = await getDb(), id = randomUUID(), now = Date.now();
  await db.insert(schema.users).values({ id, name, username: `${name.toLowerCase()}-${id.slice(0, 6)}`, role, createdAt: now, tokenVersion: 0 }).run();
  return { id, cookie: await signToken({ u: id, v: 0, e: now + 3_600_000 }) };
}
const post = (body: unknown) => new Request("http://test/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("Sprachcafé reviews", () => {
  let ended: string, upcoming: string;
  let sara: { id: string; cookie: string }, omar: { id: string; cookie: string }, nour: { id: string; cookie: string }, cancelled: { id: string; cookie: string }, admin: { id: string; cookie: string };
  beforeAll(async () => {
    const db = await getDb(), now = Date.now();
    sara = await makeUser("Sara Ahmed");
    omar = await makeUser("Omar");
    nour = await makeUser("Nour");
    cancelled = await makeUser("Cancelled");
    admin = await makeUser("Admin", "admin");
    const session = (id: string, startsAt: number) => ({ id, seriesId: null, occurrenceKey: null, teacherId: "farah", title: "A2 Sprachcafé", description: "", level: "A2", category: "conversation", startsAt, timezone: "Africa/Cairo", durationMinutes: 60, capacity: 10, priceMinor: 20000, currency: "EGP", bookingDeadlineMinutes: 0, cancellationDeadlineMinutes: 0, joinWindowMinutes: 15, meetingUrl: "https://meet.google.com/abc-defg-hij", meetingInstructions: "", status: "scheduled", published: 1, createdAt: now, updatedAt: now });
    ended = randomUUID();
    upcoming = randomUUID();
    await db.insert(schema.cafeSessions).values([session(ended, now - 3 * 3_600_000), session(upcoming, now + 3_600_000)]).run();
    const booking = (userId: string, sessionId: string, status = "booked") => ({ id: randomUUID(), sessionId, userId, status, paymentStatus: "not_required", bookedAt: now, cancelledAt: null, updatedAt: now });
    await db.insert(schema.cafeBookings).values([booking(sara.id, ended), booking(omar.id, ended), booking(sara.id, upcoming), booking(cancelled.id, ended, "cancelled")]).run();
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("needs a login", async () => {
    cookie = undefined;
    expect((await reviews.GET(new Request("http://test/x?teacher=farah"))).status).toBe(401);
    expect((await reviews.POST(post({ sessionId: ended, rating: 5 }))).status).toBe(401);
  });

  it("only attendees, only after the session, only once", async () => {
    cookie = sara.cookie;
    expect((await reviews.POST(post({ sessionId: upcoming, rating: 5 }))).status).toBe(409); // not ended yet
    // "My bookings" offers the review only for the ended one
    const mine = (await (await bookings.GET()).json()) as { bookings: { session: { id: string }; canReview: boolean }[] };
    expect(mine.bookings.find((b) => b.session.id === ended)?.canReview).toBe(true);
    expect(mine.bookings.find((b) => b.session.id === upcoming)?.canReview).toBe(false);

    expect((await reviews.POST(post({ sessionId: ended, rating: 5, comment: "Sehr gut erklärt!" }))).status).toBe(201);
    expect((await reviews.POST(post({ sessionId: ended, rating: 1 }))).status).toBe(409); // once
    cookie = omar.cookie;
    expect((await reviews.POST(post({ sessionId: ended, rating: 4 }))).status).toBe(201);
    cookie = nour.cookie; // never booked
    expect((await reviews.POST(post({ sessionId: ended, rating: 1 }))).status).toBe(403);
    cookie = cancelled.cookie; // cancelled the booking
    expect((await reviews.POST(post({ sessionId: ended, rating: 1 }))).status).toBe(403);
    expect((await reviews.POST(post({ sessionId: ended, rating: 7 }))).status).toBe(400);
  });

  it("shows the average on the teacher and the reviews with first names only", async () => {
    cookie = nour.cookie;
    const r = (await (await reviews.GET(new Request("http://test/x?teacher=farah"))).json()) as { average: number; count: number; reviews: { name: string; rating: number; comment: string }[] };
    expect(r).toMatchObject({ average: 4.5, count: 2 });
    expect(r.reviews.map((x) => x.name).sort()).toEqual(["Omar", "Sara"]); // "Sara Ahmed" → "Sara"
    const dir = (await (await directory.GET(new Request("http://test/api/sprachcafe"))).json()) as { teachers: { id: string; rating: { average: number; count: number } }[] };
    expect(dir.teachers.find((t) => t.id === "farah")?.rating).toEqual({ average: 4.5, count: 2 });
  });

  it("only the admin can delete a review", async () => {
    cookie = nour.cookie;
    const list = (await (await reviews.GET(new Request("http://test/x?teacher=farah"))).json()) as { reviews: { id: string }[] };
    const id = list.reviews[0].id;
    expect((await reviews.DELETE(new Request(`http://test/x?id=${id}`, { method: "DELETE" }))).status).toBe(403);
    cookie = admin.cookie;
    expect((await reviews.DELETE(new Request(`http://test/x?id=${id}`, { method: "DELETE" }))).status).toBe(200);
    const after = (await (await reviews.GET(new Request("http://test/x?teacher=farah"))).json()) as { count: number };
    expect(after.count).toBe(1);
  });
});
