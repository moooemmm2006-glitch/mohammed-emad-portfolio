// Feature flags (shared by server and client; NEXT_PUBLIC_* values are fixed at build time).

/**
 * The in-site AI conversation (free chat, talk about a video, AI topic talk). Off by default:
 * without an API key the learner talks with Gemini instead. Set NEXT_PUBLIC_AI_CHAT_ENABLED=true to bring it back.
 */
export function aiChatEnabled(value: string | undefined = process.env.NEXT_PUBLIC_AI_CHAT_ENABLED): boolean {
  return value === "true" || value === "1";
}
