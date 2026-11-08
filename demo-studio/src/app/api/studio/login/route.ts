import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPassword, createSessionToken, sha256, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { rateLimit, resetRate } from "@/lib/repo";
import { clientIp, jsonError } from "@/lib/session";

const Body = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("اكتب الباسورد");
  const key = `login:${(await sha256(await clientIp())).slice(0, 24)}`;
  const limit = await rateLimit(key, 5, 15 * 60_000);
  if (!limit.ok) return jsonError(`محاولات كتير. جرّب تاني بعد ${Math.ceil(limit.retryInMs / 60_000)} دقيقة.`, 429);
  if (!(await checkPassword(parsed.data.password))) return jsonError("الباسورد غلط", 401);
  await resetRate(key);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
}
