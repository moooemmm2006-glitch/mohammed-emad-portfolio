import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/db/repo";
import { SettingsSchema } from "@/lib/settings";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getSettings());
}

export async function PUT(req: Request) {
  const body = await readJson(req);
  const parsed = SettingsSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_settings", parsed.error.message);
  return NextResponse.json(saveSettings(parsed.data));
}
