import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/repo";
import { normalizeEgPhone } from "@/lib/phone";
import { SettingsSchema } from "@/lib/settings";
import { requireStudio, jsonError } from "@/lib/session";
import { zodMessage } from "@/lib/validate";

export async function GET() {
  const denied = await requireStudio();
  if (denied) return denied;
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(req: Request) {
  const denied = await requireStudio();
  if (denied) return denied;
  const parsed = SettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const local = normalizeEgPhone(parsed.data.whatsapp);
  if (!local) return jsonError("رقم الواتساب مش مظبوط");
  const s = { ...parsed.data, whatsapp: "20" + local.slice(1) };
  await saveSettings(s);
  return NextResponse.json({ settings: s });
}
