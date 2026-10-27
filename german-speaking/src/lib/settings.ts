import { z } from "zod";

// Learner settings, stored in the database. Shared by client and server.

const VoicePref = z.object({
  voiceURI: z.string().nullable().default(null),
  rate: z.number().min(0.5).max(1.5).optional(),
  pitch: z.number().min(0.5).max(1.5).optional(),
});

export const SettingsSchema = z.object({
  reportLang: z.enum(["ar", "en", "de"]).default("ar"),
  hintLang: z.enum(["ar", "en"]).default("ar"),
  ttsProvider: z.enum(["auto", "webspeech", "server"]).default("auto"),
  sttProvider: z.enum(["auto", "webspeech", "server"]).default("auto"),
  voices: z
    .object({ A1: VoicePref, A2: VoicePref, B1: VoicePref, B2: VoicePref })
    .default({ A1: { voiceURI: null }, A2: { voiceURI: null }, B1: { voiceURI: null }, B2: { voiceURI: null } }),
  speechSpeed: z.number().min(0.6).max(1.4).default(1),
  autoTurn: z.boolean().default(false),
  bargeIn: z.boolean().default(true),
  showPartnerText: z.boolean().default(true),
  correctionMode: z.enum(["recast", "immediate"]).default("recast"),
  focusSteering: z.boolean().default(true),
  levelCheckMode: z.enum(["strict", "fast"]).default("strict"),
  micTested: z.boolean().default(false),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

export function parseSettings(raw: unknown): Settings {
  const r = SettingsSchema.safeParse(raw ?? {});
  return r.success ? r.data : DEFAULT_SETTINGS;
}
