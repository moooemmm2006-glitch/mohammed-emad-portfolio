import { NextResponse } from "next/server";
import { AUTH_COOKIE, authToken, safeEqual } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.json({ ok: true });
  const body = await readJson<{ password?: string }>(req);
  if (!body?.password || !safeEqual(await authToken(body.password), await authToken(password))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return jsonError(401, "wrong_password", "Wrong password");
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
