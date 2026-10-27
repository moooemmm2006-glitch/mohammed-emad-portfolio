// Server-side configuration read from the environment. Never import this from client components.

export type TtsProvider = "webspeech" | "openai" | "elevenlabs";
export type SttProvider = "webspeech" | "openai";

export function serverConfig() {
  const env = process.env;
  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY) && env.LLM_PROVIDER !== "mock";

  let tts = (env.TTS_PROVIDER ?? "webspeech") as TtsProvider;
  if (tts === "openai" && !env.OPENAI_API_KEY) tts = "webspeech";
  if (tts === "elevenlabs" && !env.ELEVENLABS_API_KEY) tts = "webspeech";
  if (!["webspeech", "openai", "elevenlabs"].includes(tts)) tts = "webspeech";

  let stt = (env.STT_PROVIDER ?? "webspeech") as SttProvider;
  if (stt === "openai" && !env.OPENAI_API_KEY) stt = "webspeech";
  if (!["webspeech", "openai"].includes(stt)) stt = "webspeech";

  return {
    llmProvider: hasAnthropic ? ("anthropic" as const) : ("mock" as const),
    chatModel: env.ANTHROPIC_CHAT_MODEL || "claude-haiku-5-5",
    checkModel: env.ANTHROPIC_CHECK_MODEL || env.ANTHROPIC_CHAT_MODEL || "claude-haiku-5-5",
    reportModel: env.ANTHROPIC_REPORT_MODEL || "claude-opus-5-5",
    tts,
    stt,
    logViolations: env.LOG_LEVEL_VIOLATIONS === "1" || env.NODE_ENV === "development",
  };
}
