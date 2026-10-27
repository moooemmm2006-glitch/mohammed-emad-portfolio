import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/config";
import { dbTarget } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Tells the browser which providers are available. Never includes keys.
export async function GET() {
  if (!(await currentUser())) return unauthorized();
  const c = serverConfig();
  return NextResponse.json({ llm: c.llmProvider, tts: c.tts, stt: c.stt, storage: dbTarget().kind });
}
