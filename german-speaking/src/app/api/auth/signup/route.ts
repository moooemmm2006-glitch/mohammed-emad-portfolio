import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { clientIp, setSessionCookie } from "@/lib/auth/session";
import { authErrorResponse } from "@/lib/auth/routes";
import { authSecret } from "@/lib/auth/token";
import { signUp, throttled, toPublic } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().max(200),
  username: z.string().max(100),
  password: z.string().max(500),
  confirm: z.string().max(500).optional(),
  remember: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", "Invalid sign-up form");
  try {
    authSecret(); // fail before creating an account we couldn't log into
    if (await throttled(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000)) return jsonError(429, "rate_limited", "60");
    const user = await signUp(parsed.data);
    const res = NextResponse.json({ user: toPublic(user) });
    await setSessionCookie(res, user, parsed.data.remember ?? false);
    return res;
  } catch (err) {
    return authErrorResponse(err);
  }
}
