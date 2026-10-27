import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/config";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whisper-style transcription of a MediaRecorder clip. Returns { text, confidence }.
// Confidence is derived from the segments' average log-probability (whisper-1 verbose_json).
export async function POST(req: Request) {
  if (serverConfig().stt !== "openai") return jsonError(501, "webspeech", "Server STT is not configured");
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return jsonError(400, "no_audio", "No audio received");
  if (audio.size > 20 * 1024 * 1024) return jsonError(413, "too_large", "Audio clip too large");

  const model = process.env.OPENAI_STT_MODEL || "whisper-1";
  const fd = new FormData();
  fd.append("file", audio, "speech.webm");
  fd.append("model", model);
  fd.append("language", "de");
  fd.append("response_format", model === "whisper-1" ? "verbose_json" : "json");
  try {
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: fd,
    });
    if (!r.ok) {
      console.error("[stt] upstream error", r.status, await r.text().catch(() => ""));
      return jsonError(502, "stt_failed", "Transcription provider error");
    }
    const data = (await r.json()) as { text?: string; segments?: { avg_logprob?: number }[] };
    const segs = data.segments ?? [];
    const confidence = segs.length
      ? Math.max(0, Math.min(1, Math.exp(segs.reduce((n, s) => n + (s.avg_logprob ?? 0), 0) / segs.length)))
      : null;
    return NextResponse.json({ text: (data.text ?? "").trim(), confidence });
  } catch (err) {
    console.error("[stt] failed", err);
    return jsonError(502, "stt_failed", "Transcription provider unreachable");
  }
}
