import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, rememberedSession, setSessionCookie, unauthorized } from "@/lib/auth/session";
import { authErrorResponse } from "@/lib/auth/routes";
import { changePassword } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ current: z.string().max(500), next: z.string().max(500), confirm: z.string().max(500).optional() });

// Changing the password signs out every other device; this one gets a fresh cookie.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", "Invalid body");
  try {
    const remember = await rememberedSession();
    const tokenVersion = await changePassword(user.id, parsed.data.current, parsed.data.next, parsed.data.confirm);
    const res = NextResponse.json({ ok: true });
    await setSessionCookie(res, { id: user.id, tokenVersion }, remember);
    return res;
  } catch (err) {
    return authErrorResponse(err);
  }
}
