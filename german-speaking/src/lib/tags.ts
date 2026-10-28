import { DICT } from "./messages";
import type { UILang } from "./client/i18n";

// Grammar/pronunciation tags used by the report and the weakness tracker (server side).
// Labels are in messages/*.json as tag_<name>; the English label is used in prompts.
// In the browser use useUI().tag(name), which only needs the active language.
const TAG_NAMES = [
  "modalverben",
  "trennbare_verben",
  "artikel_genus",
  "dativ_akkusativ",
  "wortstellung",
  "verb_position",
  "perfekt",
  "praeteritum",
  "praepositionen",
  "konjunktiv_ii",
  "nebensaetze",
  "adjektivendungen",
  "konjugation",
  "plural",
  "negation",
  "pronomen",
  "passiv",
  "wortschatz",
  "register_sie_du",
  "pron_ch_sch",
  "pron_umlaute",
  "pron_p_b",
  "pron_r",
  "pron_vokallaenge",
  "pron_z_w_v",
  "pron_auslautverhaertung",
  "doppeltes_wort",
  "fluency_pausen",
] as const;

export const GRAMMAR_TAGS: Record<string, string> = Object.fromEntries(TAG_NAMES.map((t) => [t, (DICT.en as Record<string, string>)[`tag_${t}`]]));

export function tagLabel(tag: string, lang: UILang = "ar"): string {
  const label = (DICT[lang] as Record<string, string>)[`tag_${tag}`];
  return label ?? tag.replace(/_/g, " ");
}
