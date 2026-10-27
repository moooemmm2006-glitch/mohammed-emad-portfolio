import { z } from "zod";
import { runPartnerTurn, type TurnEvent } from "@/lib/conversation";
import { LLMRefusalError } from "@/lib/llm";
import { jsonError, readJson } from "@/lib/api";

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
  const { id } = await params;
  const parsed = Body.safeParse((await readJson(req)) ?? {});
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: TurnEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
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
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
