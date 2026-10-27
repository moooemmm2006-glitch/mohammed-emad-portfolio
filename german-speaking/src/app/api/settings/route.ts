import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/db/repo";
import { SettingsSchema } from "@/lib/settings";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json(await getSettings(user.id));
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = await readJson(req);
  const parsed = SettingsSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_settings", parsed.error.message);
  return NextResponse.json(await saveSettings(parsed.data, user.id));
}
