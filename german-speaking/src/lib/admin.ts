import { count, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "./db";
import { deleteAll } from "./db/repo";
import { discardPhoto } from "./photo";
import { minutesThisWeek } from "./usage";

// Admin overview of all learners and account actions.

export interface StudentRow {
  id: string;
  name: string;
  username: string;
  role: "admin" | "student";
  disabled: boolean;
  createdAt: number;
  lastActiveAt: number | null;
  sessions: number;
  minutesThisWeek: number;
  dailyMinutes: number | null;
  dailyReplies: number | null;
}

export async function listStudents(): Promise<StudentRow[]> {
  const db = await getDb();
  const [users, sessionCounts, lastSession, minutes] = await Promise.all([
    db.select().from(schema.users).where(isNotNull(schema.users.username)).all(),
    db.select({ userId: schema.sessions.userId, n: count() }).from(schema.sessions).groupBy(schema.sessions.userId).all(),
    db
      .select({ userId: schema.sessions.userId, at: schema.sessions.lastActiveAt })
      .from(schema.sessions)
      .all()
      .then((rows) => rows.reduce((m, r) => m.set(r.userId, Math.max(m.get(r.userId) ?? 0, r.at)), new Map<string, number>())),
    minutesThisWeek(),
  ]);
  const sessions = new Map(sessionCounts.map((r) => [r.userId, r.n]));
  return users
    .map((u) => ({
      id: u.id,
      name: u.name ?? u.username ?? "",
      username: u.username ?? "",
      role: u.role === "admin" ? ("admin" as const) : ("student" as const),
      disabled: Boolean(u.disabled),
      createdAt: u.createdAt,
      lastActiveAt: Math.max(u.lastActiveAt ?? 0, lastSession.get(u.id) ?? 0) || null,
      sessions: sessions.get(u.id) ?? 0,
      minutesThisWeek: minutes.get(u.id) ?? 0,
      dailyMinutes: u.dailyMinutes,
      dailyReplies: u.dailyReplies,
    }))
    .sort((a, b) => (b.lastActiveAt ?? b.createdAt) - (a.lastActiveAt ?? a.createdAt));
}

export async function updateStudent(id: string, patch: { disabled?: boolean; dailyMinutes?: number | null; dailyReplies?: number | null }) {
  const db = await getDb();
  const set: Partial<typeof schema.users.$inferInsert> = {};
  if (patch.dailyMinutes !== undefined) set.dailyMinutes = patch.dailyMinutes || null;
  if (patch.dailyReplies !== undefined) set.dailyReplies = patch.dailyReplies || null;
  if (patch.disabled !== undefined) {
    set.disabled = patch.disabled ? 1 : 0;
  }
  if (!Object.keys(set).length) return;
  const user = await db.select({ v: schema.users.tokenVersion }).from(schema.users).where(eq(schema.users.id, id)).get();
  // Disabling also invalidates the student's cookies immediately.
  if (patch.disabled) set.tokenVersion = (user?.v ?? 0) + 1;
  await db.update(schema.users).set(set).where(eq(schema.users.id, id)).run();
}

/** Delete an account and everything it owns. */
export async function deleteStudent(id: string) {
  const db = await getDb();
  const user = await db.select({ photo: schema.users.photo }).from(schema.users).where(eq(schema.users.id, id)).get();
  await deleteAll(id);
  await db.batch([db.delete(schema.usage).where(eq(schema.usage.userId, id)), db.delete(schema.users).where(eq(schema.users.id, id))]);
  await discardPhoto(user?.photo);
}
