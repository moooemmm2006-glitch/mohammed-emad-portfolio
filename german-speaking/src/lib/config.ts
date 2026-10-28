// Server-side configuration read from the environment. Never import this from client components.

export type TtsProvider = "webspeech" | "openai" | "elevenlabs";
export type SttProvider = "webspeech" | "openai";

export function serverConfig() {
  const env = process.env;
  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY);

  let tts = (env.TTS_PROVIDER ?? "webspeech") as TtsProvider;
  if (tts === "openai" && !env.OPENAI_API_KEY) tts = "webspeech";
  if (tts === "elevenlabs" && !env.ELEVENLABS_API_KEY) tts = "webspeech";
  if (!["webspeech", "openai", "elevenlabs"].includes(tts)) tts = "webspeech";

  let stt = (env.STT_PROVIDER ?? "webspeech") as SttProvider;
  if (stt === "openai" && !env.OPENAI_API_KEY) stt = "webspeech";
  if (!["webspeech", "openai"].includes(stt)) stt = "webspeech";

  return {
    llmProvider: hasAnthropic ? ("anthropic" as const) : ("none" as const),
    // Reading texts (Lesen) and free-writing corrections (Schreiben); conversations happen in Gemini.
    textModel: env.ANTHROPIC_TEXT_MODEL || "claude-haiku-5-5",
    correctionModel: env.ANTHROPIC_CORRECTION_MODEL || "claude-opus-5-5",
    tts,
    stt,
  };
}
