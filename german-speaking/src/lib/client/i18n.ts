// UI strings in three languages, one JSON file each (messages/ar.json · de.json · en.json).
// This module has no strings itself, so the browser never downloads all three files.
// Arabic is the default. Learning content (German sentences, the book's Arabic meanings) is not translated here.

export const UI_LANGS = ["ar", "de", "en"] as const;
export type UILang = (typeof UI_LANGS)[number];

export type TKey = keyof typeof import("../../../messages/ar.json");
export type Messages = Record<TKey, string>;

/** Load another language's messages when the learner switches (its own small chunk). */
export function loadMessages(l: UILang): Promise<Messages> {
  const load = { ar: () => import("../../../messages/ar.json"), de: () => import("../../../messages/de.json"), en: () => import("../../../messages/en.json") }[l];
  return load().then((m) => m.default as Messages);
}

export const isUILang = (v: unknown): v is UILang => typeof v === "string" && (UI_LANGS as readonly string[]).includes(v);

export const dirOf = (l: UILang): "rtl" | "ltr" => (l === "ar" ? "rtl" : "ltr");

/** Locale for dates and numbers. */
export const localeOf = (l: UILang) => (l === "ar" ? "ar-EG" : l === "de" ? "de-DE" : "en-GB");

/** Cookie with the chosen language (also used before login). */
export const LANG_COOKIE = "gs_lang";

/** Fill "{n}"-style placeholders in a translated string. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}
