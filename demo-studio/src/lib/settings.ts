import { z } from "zod";
import { OWNER } from "./owner";

export const PRESET_KEYS = ["default", "afterCall", "followUp"] as const;
export const PRESET_LABEL: Record<(typeof PRESET_KEYS)[number], string> = {
  default: "أول رسالة",
  afterCall: "بعد المكالمة",
  followUp: "متابعة بعد يومين",
};

export const SettingsSchema = z.object({
  ownerName: z.string().trim().min(1).max(60),
  whatsapp: z.string().trim().min(8).max(20),
  portfolioUrl: z.string().trim().url().max(200),
  defaultExpiryDays: z.coerce.number().int().min(1).max(90),
  presets: z.object({
    default: z.string().trim().min(1).max(1000),
    afterCall: z.string().trim().min(1).max(1000),
    followUp: z.string().trim().min(1).max(1000),
  }),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  ownerName: "محمد",
  whatsapp: OWNER.whatsapp,
  portfolioUrl: OWNER.portfolioUrl,
  defaultExpiryDays: 14,
  presets: {
    default: "السلام عليكم، مع حضرتك محمد 👋 شفت {name} على جوجل ماب وعجبتني التقييمات، فعملت لحضرتك نموذج سريع لشكل موقعكم: {link} — لو عجبك نكمّله ونظبطه على خدماتكم بالظبط 🙏",
    afterCall: "زي ما اتفقنا في المكالمة، ده النموذج: {link}",
    followUp: "مساء الخير 👋 بفكّر حضرتك بالنموذج اللي عملته لـ {name}: {link} — لو حابب نعدّل أي حاجة فيه أو تسألني عن أي تفصيلة أنا موجود 🙏",
  },
};

export function fillPreset(template: string, vars: { name: string; link: string }): string {
  return template.replace(/\{name\}/g, vars.name).replace(/\{link\}/g, vars.link);
}
