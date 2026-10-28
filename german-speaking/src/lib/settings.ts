import { z } from "zod";

// Learner settings, stored in the database. Shared by client and server.

const VoicePref = z.object({
  voiceURI: z.string().nullable().default(null),
  rate: z.number().min(0.5).max(1.5).optional(),
  pitch: z.number().min(0.5).max(1.5).optional(),
});

export const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 2.5] as const;

const Speed = z.number().min(1).max(2.5);

export const SettingsSchema = z.object({
  ttsProvider: z.enum(["auto", "webspeech", "server"]).default("auto"),
  sttProvider: z.enum(["auto", "webspeech", "server"]).default("auto"),
  voices: z
    .object({ A1: VoicePref, A2: VoicePref, B1: VoicePref, B2: VoicePref })
    .default({ A1: { voiceURI: null }, A2: { voiceURI: null }, B1: { voiceURI: null }, B2: { voiceURI: null } }),
  /** Playback speed per level (1× … 2.5×), on top of the level's natural rate. */
  speeds: z.object({ A1: Speed, A2: Speed, B1: Speed, B2: Speed }).default({ A1: 1, A2: 1, B1: 1, B2: 1 }),
  /** "اسمع وكرر": how long a silence ends what the learner says. Shorter pauses never stop it. */
  silenceMs: z.number().min(1500).max(6000).default(3000),
  micTested: z.boolean().default(false),
  /** Interface language (also kept in a cookie for logged-out visitors). */
  uiLang: z.enum(["ar", "de", "en"]).default("ar"),
  /** 3D effects: auto = on for computers, reduced on low-end phones. */
  effects: z.enum(["auto", "on", "mild", "off"]).default("auto"),
  /** The "how to use the site" video was shown (it opens by itself only once). */
  explainerSeen: z.boolean().default(false),
  /** The "first time here?" strip on the level pages was closed. */
  introDismissed: z.boolean().default(false),
  /** Last day (learner's calendar) the "برافو! عايز تاخد استراحة؟" toast was shown. */
  pauseOfferDay: z.string().max(10).nullable().default(null),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

export function parseSettings(raw: unknown): Settings {
  const r = SettingsSchema.safeParse(raw ?? {});
  return r.success ? r.data : DEFAULT_SETTINGS;
}
