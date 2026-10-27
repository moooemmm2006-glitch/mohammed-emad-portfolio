import { z } from "zod";
import { serverConfig } from "@/lib/config";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { LEVELS, LEVEL_CONFIG } from "@/lib/levels";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().min(1).max(1500), level: z.enum(LEVELS), speed: z.number().min(0.5).max(2.5).optional() });

const OPENAI_DEFAULT_VOICES = { A1: "nova", A2: "echo", B1: "shimmer", B2: "onyx" } as const;

// Premium TTS (OpenAI or ElevenLabs), one distinct voice per level. Returns audio/mpeg.
// The browser falls back to the Web Speech API on any non-200 answer.
export async function POST(req: Request) {
  if (!(await currentUser())) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const { text, level } = parsed.data;
  const cfg = serverConfig();
  const levelRate = LEVEL_CONFIG[level].voice.rate;
  // OpenAI accepts 0.25-4; ElevenLabs only 0.7-1.2 (clamped below).
  const speed = Math.max(0.5, Math.min(4, (parsed.data.speed ?? 1) * levelRate));

  try {
    let upstream: Response;
    if (cfg.tts === "openai") {
      upstream = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
          voice: process.env[`OPENAI_TTS_VOICE_${level}`] || OPENAI_DEFAULT_VOICES[level],
          input: text,
          speed,
          instructions: `Speak standard German clearly${level === "A1" ? ", slowly and very clearly for a beginner" : level === "B2" ? " at a natural professional pace" : ""}.`,
          response_format: "mp3",
        }),
      });
    } else if (cfg.tts === "elevenlabs") {
      const voice = process.env[`ELEVENLABS_VOICE_${level}`];
      if (!voice) return jsonError(501, "no_voice", `ELEVENLABS_VOICE_${level} is not set`);
      upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, {
        method: "POST",
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: Math.max(0.7, Math.min(1.2, speed)) },
        }),
      });
    } else {
      return jsonError(501, "webspeech", "Server TTS is not configured; use the browser voice");
    }
    if (!upstream.ok || !upstream.body) {
      console.error("[tts] upstream error", upstream.status, await upstream.text().catch(() => ""));
      return jsonError(502, "tts_failed", "TTS provider error");
    }
    return new Response(upstream.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[tts] failed", err);
    return jsonError(502, "tts_failed", "TTS provider unreachable");
  }
}
