// All three message files — server side (layout, reports, prompts) and tests.
// The browser only receives the active language (see UIProvider).
import ar from "../../messages/ar.json";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import type { TKey, UILang } from "./client/i18n";

export const DICT: Record<UILang, Record<TKey, string>> = { ar, de, en };
