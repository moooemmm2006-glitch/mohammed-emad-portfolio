import { NextResponse } from "next/server";
import { z } from "zod";
import { runPartnerTurn, type TurnEvent } from "@/lib/conversation";
import { LLMRefusalError } from "@/lib/llm";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, ownSession, unauthorized } from "@/lib/auth/session";
import { limitReached, MAX_GAP_MS, recordUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  text: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  alternatives: z.array(z.string().max(2000)).max(5).optional(),
  input: z.enum(["voice", "text"]).optional(),
});

// Streams newline-delimited JSON events (status → sentence… → done) so the browser can
// start speaking the first sentence while the rest is still arriving.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const session = await ownSession(id, user);
  if (!session) return jsonError(404, "not_found", "Session not found");
  const parsed = Body.safeParse((await readJson(req)) ?? {});
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const hit = await limitReached(user);
  if (hit) return NextResponse.json({ error: { code: "usage_limit", message: "Daily limit reached", ...hit } }, { status: 429 });
  // Conversation time = the gap since the last turn (capped, so a break doesn't count).
  const gap = parsed.data.text?.trim() ? Math.min(MAX_GAP_MS, Math.max(0, Date.now() - session.lastActiveAt)) : 0;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let usage: Promise<void> | null = null;
      const emit = (e: TurnEvent) => {
        if (e.type === "done") usage = recordUsage(user.id, { replies: 1, ms: gap }).catch((err) => console.error("[usage] failed:", err));
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      };
      try {
        await runPartnerTurn({
          sessionId: id,
          userText: parsed.data.text,
          confidence: parsed.data.confidence,
          alternatives: parsed.data.alternatives,
          input: parsed.data.input,
          emit,
          signal: req.signal,
        });
      } catch (err) {
        console.error("[turn] failed:", err);
        const code = err instanceof LLMRefusalError ? "refusal" : "llm_failed";
        emit({ type: "error", code, message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        await usage;
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
