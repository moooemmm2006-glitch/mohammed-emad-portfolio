import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { getSession, type SessionRow } from "../db/repo";
import { jsonError } from "../api";
import { REMEMBER_MS, SESSION_COOKIE, SHORT_MS, signToken, verifyToken } from "./token";
import { getUser, type UserRow } from "./users";

// Server-side session handling for API routes. The middleware only checks the signature;
// here the user is loaded so disabled accounts and changed passwords take effect at once.

const ACTIVE_EVERY_MS = 5 * 60 * 1000;

/** Whether the current cookie was issued with "remember me". */
export async function rememberedSession(): Promise<boolean> {
  const p = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value).catch(() => null);
  return p?.r === 1;
}

/** The logged-in user, or null. */
export async function currentUser(): Promise<UserRow | null> {
  const jar = await cookies();
  const p = await verifyToken(jar.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!p) return null;
  const user = await getUser(p.u);
  if (!user || user.disabled || user.tokenVersion !== p.v) return null;
  const now = Date.now();
  if (!user.lastActiveAt || now - user.lastActiveAt > ACTIVE_EVERY_MS) {
    void getDb()
      .then((db) => db.update(schema.users).set({ lastActiveAt: now }).where(eq(schema.users.id, user.id)).run())
      .catch(() => {});
  }
  return user;
}

export const unauthorized = () => jsonError(401, "unauthorized", "Login required");
export const forbidden = () => jsonError(403, "forbidden", "Admins only");

/** The session if it exists and belongs to this user. Someone else's session looks like a missing one. */
export async function ownSession(id: string, user: UserRow): Promise<SessionRow | null> {
  const s = await getSession(id);
  return s && s.userId === user.id ? s : null;
}

export async function setSessionCookie(res: NextResponse, user: Pick<UserRow, "id" | "tokenVersion">, remember: boolean) {
  const ttl = remember ? REMEMBER_MS : SHORT_MS;
  const token = await signToken({ u: user.id, v: user.tokenVersion, e: Date.now() + ttl, ...(remember ? { r: 1 as const } : {}) });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge → a browser-session cookie when "remember me" is off.
    ...(remember ? { maxAge: Math.floor(REMEMBER_MS / 1000) } : {}),
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
