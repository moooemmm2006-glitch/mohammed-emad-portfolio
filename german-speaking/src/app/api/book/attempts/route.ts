import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { scoreAndRecord } from "@/lib/bookApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ heard: z.array(z.object({ n: z.number().int().min(1).max(10000), said: z.string().max(600) })).min(1).max(50) });

// Saves each repeated sentence as it happens, so progress isn't lost when the page is closed.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  return NextResponse.json({ results: await scoreAndRecord(user.id, parsed.data.heard) });
}
