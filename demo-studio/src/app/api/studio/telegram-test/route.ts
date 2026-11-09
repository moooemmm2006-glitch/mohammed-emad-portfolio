import { NextResponse } from "next/server";
import { requireStudio, jsonError } from "@/lib/session";
import { sendTelegram } from "@/lib/telegram";

export async function POST() {
  const denied = await requireStudio();
  if (denied) return denied;
  const r = await sendTelegram("✅ رسالة تجربة من Demo Studio — التنبيهات شغالة 🔥");
  if (!r.ok) return jsonError(r.error || "الإرسال فشل");
  return NextResponse.json({ ok: true });
}
