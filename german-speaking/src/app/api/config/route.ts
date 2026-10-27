import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

// Tells the browser which providers are available. Never includes keys.
export function GET() {
  const c = serverConfig();
  return NextResponse.json({ llm: c.llmProvider, tts: c.tts, stt: c.stt });
}
