import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { clientIp, setSessionCookie } from "@/lib/auth/session";
import { authErrorResponse } from "@/lib/auth/routes";
import { authSecret } from "@/lib/auth/token";
import { login, toPublic } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ username: z.string().max(100), password: z.string().max(500), remember: z.boolean().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", "Invalid login form");
  try {
    authSecret();
    const user = await login(parsed.data.username, parsed.data.password, clientIp(req));
    const res = NextResponse.json({ user: toPublic(user) });
    await setSessionCookie(res, user, parsed.data.remember ?? false);
    return res;
  } catch (err) {
    return authErrorResponse(err);
  }
}
