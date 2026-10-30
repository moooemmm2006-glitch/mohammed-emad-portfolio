import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { and, count, eq, gte, isNotNull, lt } from "drizzle-orm";
import { getDb, schema } from "../db";
import { LOCAL_USER } from "../db/repo";
import { checkName, checkPassword, checkUsername, normalizeUsername, type FieldError } from "./validation";

// Accounts: sign-up, login with rate limiting, password changes. Passwords are only ever
// handled as bcrypt hashes here; nothing in this file logs them.

export type UserRow = typeof schema.users.$inferSelect;

/** What the browser may see about a user (never the hash). */
export interface PublicUser {
  id: string;
  name: string;
  username: string;
  role: "admin" | "student";
  photo: string | null;
  createdAt: number;
}

export function toPublic(u: UserRow): PublicUser {
  return { id: u.id, name: u.name ?? u.username ?? "", username: u.username ?? "", role: u.role === "admin" ? "admin" : "student", photo: u.photo, createdAt: u.createdAt };
}

export class AuthError extends Error {
  constructor(
    public code: FieldError | "username_taken" | "user_not_found" | "wrong_password" | "disabled" | "rate_limited" | "wrong_current_password",
    public status = 400,
    public retryAfterSec?: number,
  ) {
    super(code);
  }
}

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 11;
// Compared against when the username doesn't exist, so both paths take about as long.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export const hashPassword = (p: string) => bcrypt.hash(p, BCRYPT_ROUNDS);
export const verifyPassword = (p: string, hash: string) => bcrypt.compare(p, hash);

export async function getUser(id: string): Promise<UserRow | undefined> {
  const db = await getDb();
  return db.select().from(schema.users).where(eq(schema.users.id, id)).get();
}

export async function findByUsername(username: string): Promise<UserRow | undefined> {
  const db = await getDb();
  return db.select().from(schema.users).where(eq(schema.users.username, normalizeUsername(username))).get();
}

async function accountCount(): Promise<number> {
  const db = await getDb();
  const r = await db.select({ n: count() }).from(schema.users).where(isNotNull(schema.users.username)).get();
  return r?.n ?? 0;
}

/**
 * Who becomes admin at sign-up. Admin rights live only in `users.role` on the server; this is
 * the one place that sets it. With `ADMIN_USERNAMES` (comma-separated) only those usernames
 * become admin. Without it, the first account becomes admin only outside production (local
 * development and tests): in production an empty database (a new or temporary one) must not
 * hand the dashboard to whoever signs up first.
 */
export function adminAtSignUp(username: string, firstAccount: boolean, env: Record<string, string | undefined> = process.env): boolean {
  const list = (env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((u) => normalizeUsername(u))
    .filter(Boolean);
  if (list.length) return list.includes(normalizeUsername(username));
  return firstAccount && env.NODE_ENV !== "production";
}

/**
 * Create an account. The first account takes over everything that was stored before
 * accounts existed (the old single "local" learner).
 */
export async function signUp(input: { name: string; username: string; password: string; confirm?: string }): Promise<UserRow> {
  const err = checkName(input.name) ?? checkUsername(input.username) ?? checkPassword(input.password, input.confirm);
  if (err) throw new AuthError(err);
  const username = normalizeUsername(input.username);
  if (await findByUsername(username)) throw new AuthError("username_taken", 409);

  const first = (await accountCount()) === 0;
  const now = Date.now();
  const row: UserRow = {
    id: randomUUID(),
    name: input.name.trim(),
    createdAt: now,
    username,
    passwordHash: await hashPassword(input.password),
    role: adminAtSignUp(username, first) ? "admin" : "student",
    disabled: 0,
    tokenVersion: 0,
    photo: null,
    dailyMinutes: null,
    dailyReplies: null,
    lastActiveAt: now,
  };
  const db = await getDb();
  try {
    await db.insert(schema.users).values(row).run();
  } catch (e) {
    // Two sign-ups racing for the same name: the unique index decides.
    if (String(e).includes("UNIQUE")) throw new AuthError("username_taken", 409);
    throw e;
  }
  if (first) await adoptLocalData(row.id);
  return row;
}

/** Move data saved before accounts existed ("local") to this user. */
export async function adoptLocalData(userId: string) {
  const db = await getDb();
  const hasLocalSettings = await db.select().from(schema.settings).where(eq(schema.settings.userId, LOCAL_USER)).get();
  await db.batch([
    db.update(schema.sessions).set({ userId }).where(eq(schema.sessions.userId, LOCAL_USER)),
    db.update(schema.reports).set({ userId }).where(eq(schema.reports.userId, LOCAL_USER)),
    db.update(schema.weaknesses).set({ userId }).where(eq(schema.weaknesses.userId, LOCAL_USER)),
    ...(hasLocalSettings
      ? [db.delete(schema.settings).where(eq(schema.settings.userId, userId)), db.update(schema.settings).set({ userId }).where(eq(schema.settings.userId, LOCAL_USER))]
      : []),
    db.delete(schema.users).where(eq(schema.users.id, LOCAL_USER)),
  ]);
}

// ---------- rate limiting ----------
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILS = 5;

const attemptKey = (username: string, ip: string) => `login:${normalizeUsername(username)}:${ip}`;

async function failuresSince(key: string, now: number) {
  const db = await getDb();
  return db
    .select({ at: schema.loginAttempts.at })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.key, key), gte(schema.loginAttempts.at, now - LOGIN_WINDOW_MS)))
    .all();
}

/** Check username + password. Throws AuthError (rate_limited / user_not_found / wrong_password / disabled). */
export async function login(username: string, password: string, ip: string, now = Date.now()): Promise<UserRow> {
  const key = attemptKey(username, ip);
  const fails = await failuresSince(key, now);
  if (fails.length >= LOGIN_MAX_FAILS) {
    const oldest = Math.min(...fails.map((f) => f.at));
    throw new AuthError("rate_limited", 429, Math.max(1, Math.ceil((oldest + LOGIN_WINDOW_MS - now) / 1000)));
  }
  const user = await findByUsername(username);
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  const db = await getDb();
  if (!user || !user.passwordHash || !ok) {
    await db.batch([
      db.insert(schema.loginAttempts).values({ key, at: now }),
      db.delete(schema.loginAttempts).where(lt(schema.loginAttempts.at, now - 24 * 60 * 60 * 1000)),
    ]);
    throw new AuthError(user ? "wrong_password" : "user_not_found", 401);
  }
  if (user.disabled) throw new AuthError("disabled", 403);
  await db.batch([
    db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.key, key)),
    db.update(schema.users).set({ lastActiveAt: now }).where(eq(schema.users.id, user.id)),
  ]);
  return user;
}

// ---------- profile ----------
export async function updateName(userId: string, name: string) {
  const err = checkName(name);
  if (err) throw new AuthError(err);
  const db = await getDb();
  await db.update(schema.users).set({ name: name.trim() }).where(eq(schema.users.id, userId)).run();
}

/** Change the password (needs the current one). Signs out other devices; returns the new token version. */
export async function changePassword(userId: string, current: string, next: string, confirm?: string): Promise<number> {
  const user = await getUser(userId);
  if (!user?.passwordHash || !(await verifyPassword(current, user.passwordHash))) throw new AuthError("wrong_current_password", 401);
  const err = checkPassword(next, confirm);
  if (err) throw new AuthError(err);
  return setPassword(userId, next);
}

/** Set a new password and invalidate every existing session cookie. */
export async function setPassword(userId: string, password: string): Promise<number> {
  const user = await getUser(userId);
  const version = (user?.tokenVersion ?? 0) + 1;
  const db = await getDb();
  await db.update(schema.users).set({ passwordHash: await hashPassword(password), tokenVersion: version }).where(eq(schema.users.id, userId)).run();
  return version;
}

/** A readable temporary password for admin resets (no look-alike characters). */
export function tempPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("");
}

export async function setPhoto(userId: string, photo: string | null) {
  const db = await getDb();
  await db.update(schema.users).set({ photo }).where(eq(schema.users.id, userId)).run();
}

/** Generic throttle on the attempts table (used for sign-ups per IP). */
export async function throttled(key: string, max: number, windowMs: number, now = Date.now()): Promise<boolean> {
  const db = await getDb();
  const r = await db
    .select({ n: count() })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.key, key), gte(schema.loginAttempts.at, now - windowMs)))
    .get();
  if ((r?.n ?? 0) >= max) return true;
  await db.insert(schema.loginAttempts).values({ key, at: now }).run();
  return false;
}
