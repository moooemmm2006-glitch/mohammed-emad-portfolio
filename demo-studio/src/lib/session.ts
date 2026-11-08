import "server-only";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

export async function isStudio(): Promise<boolean> {
  const c = await cookies();
  return verifySessionToken(c.get(SESSION_COOKIE)?.value);
}

/** For route handlers: returns a 401 response when not logged in, else null. */
export async function requireStudio(): Promise<NextResponse | null> {
  if (await isStudio()) return null;
  return NextResponse.json({ error: "لازم تسجّل دخول الأول" }, { status: 401 });
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "0.0.0.0";
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
