import { NextResponse } from "next/server";
import { getHint } from "@/lib/conversation";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json(await getHint(id));
  } catch (err) {
    console.error("[hint] failed:", err);
    return jsonError(502, "hint_failed", err instanceof Error ? err.message : "Hint failed");
  }
}
