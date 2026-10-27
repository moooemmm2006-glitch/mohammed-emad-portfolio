// Rule-based sentence corrector for demo mode (no API key). It only knows a handful of frequent
// mistakes, so the report labels its result as a demo correction; the full correction needs Claude.

import type { Fix } from "./corrections";

type Lang = "ar" | "en" | "de";
const T = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);

interface Rule {
  apply(text: string, lang: Lang): { text: string; fix: Fix } | null;
}

const MODALS = "kann|kannst|können|könnt|muss|musst|müssen|müsst|will|willst|wollen|wollt|möchte|möchtest|möchten|möchtet|soll|sollst|sollen|sollt|darf|darfst|dürfen|dürft";
// Words ending in -en that are not infinitives.
const NOT_INF = new Set(["einen", "keinen", "meinen", "deinen", "seinen", "ihren", "unseren", "euren", "diesen", "jeden", "allen", "vielen", "morgen", "wieder", "unten", "oben", "eben", "gestern", "zusammen", "trotzdem", "denen", "wollen", "können", "müssen", "dürfen", "sollen", "möchten"]);

const SEIN_VERBS = "gegangen|gefahren|gekommen|geflogen|gelaufen|geblieben|aufgestanden|angekommen|umgezogen|eingeschlafen|gestorben|geworden|gewesen|passiert";
const SEPARABLE: Record<string, [string, string]> = {
  anrufe: ["rufe", "an"],
  aufstehe: ["stehe", "auf"],
  einkaufe: ["kaufe", "ein"],
  mitkomme: ["komme", "mit"],
  ankomme: ["komme", "an"],
  fernsehe: ["sehe", "fern"],
  anfange: ["fange", "an"],
  aufräume: ["räume", "auf"],
  vorbereite: ["bereite", "vor"],
  zurückkomme: ["komme", "zurück"],
};

const DAT_PREPS = "mit|bei|von|zu|aus|nach|seit|gegenüber";

/** Dative form of a determiner, guessing plural from the noun ending (-en/-ern/-eln → plural). */
function dative(det: string, noun: string): string | null {
  const d = det.toLowerCase();
  const plural = /^[A-ZÄÖÜ]/.test(noun) && /(en|ern|eln)$/.test(noun) && noun.length > 4;
  if (d === "das") return "dem";
  if (d === "die") return plural ? "den" : /er$/.test(noun) ? null : "der";
  if (d === "den") return plural ? null : "dem";
  const stem = d.replace(/e$/, ""); // meine → mein, eine → ein
  if (!/^(mein|dein|sein|ihr|unser|euer|ein|kein)$/.test(stem)) return null;
  return plural ? `${stem}en` : `${stem}er`;
}

function keepCase(original: string, replacement: string) {
  return /^[A-ZÄÖÜ]/.test(original) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
}

const RULES: Rule[] = [
  // "ich habe ein ich habe …" — a restarted phrase.
  {
    apply(text, lang) {
      const m = text.match(/\b(\p{L}+)\s+(\p{L}+)\s+\p{L}+\s+\1\s+\2\b/iu);
      if (!m) return null;
      const right = `${m[1]} ${m[2]}`;
      return {
        text: text.replace(m[0], right),
        fix: { wrong: m[0], right, tag: "doppeltes_wort", severity: "low", explanation: T(lang, "بدأت الجملة مرتين. عادي وانت بتفكّر، بس حاول تكمّل من غير ما تعيد.", "You started the phrase twice. Normal while thinking, but try to continue without restarting.") },
      };
    },
  },
  // "mit mit" — the same word twice.
  {
    apply(text, lang) {
      const m = text.match(/\b(\p{L}+)(\s+\1)+\b/iu);
      if (!m || m[1].length < 2) return null;
      return {
        text: text.replace(m[0], m[1]),
        fix: { wrong: m[0], right: m[1], tag: "doppeltes_wort", severity: "low", explanation: T(lang, `كررت كلمة «${m[1]}» مرتين ورا بعض.`, `You said "${m[1]}" twice in a row.`) },
      };
    },
  },
  // "Sehr Hilfe mir" → "Das hilft mir sehr."
  {
    apply(text, lang) {
      const m = text.match(/\b(sehr\s+hilfe\s+mir|hilfe\s+mir\s+sehr)\b/i);
      if (!m) return null;
      const right = keepCase(m[0], "das hilft mir sehr");
      return {
        text: text.replace(m[0], right),
        fix: { wrong: m[0], right, tag: "wortschatz", severity: "medium", explanation: T(lang, "«Hilfe» اسم (مساعدة)؛ الفعل هو helfen. وفي الجملة لازم يكون في فاعل وفعل: Das hilft mir sehr.", "\"Hilfe\" is a noun; the verb is helfen, and the sentence needs a subject: Das hilft mir sehr.") },
      };
    },
  },
  // "Ich habe 25 Jahre" → "Ich bin 25 Jahre alt."
  {
    apply(text, lang) {
      const m = text.match(/\b(ich|du|er|sie)\s+(habe|hast|hat)\s+(\d+|\p{L}+zig|zwanzig|dreißig)\s+jahre?\b(?!\s+alt)/iu);
      if (!m) return null;
      const verb = ({ ich: "bin", du: "bist", er: "ist", sie: "ist" } as Record<string, string>)[m[1].toLowerCase()];
      const right = `${m[1]} ${verb} ${m[3]} Jahre alt`;
      return {
        text: text.replace(m[0], right),
        fix: { wrong: m[0], right, tag: "wortschatz", severity: "medium", explanation: T(lang, "العمر في الألماني بـ sein مش haben: Ich bin 25 Jahre alt (مش «عندي 25 سنة»).", "Age uses sein, not haben: Ich bin 25 Jahre alt.") },
      };
    },
  },
  // "ich bin Hunger" → "ich habe Hunger"
  {
    apply(text, lang) {
      const m = text.match(/\b(ich|du|wir)\s+(bin|bist|sind)\s+(hunger|durst|angst|zeit)\b/i);
      if (!m) return null;
      const verb = ({ ich: "habe", du: "hast", wir: "haben" } as Record<string, string>)[m[1].toLowerCase()];
      const right = `${m[1]} ${verb} ${m[3][0].toUpperCase()}${m[3].slice(1).toLowerCase()}`;
      return {
        text: text.replace(m[0], right),
        fix: { wrong: m[0], right, tag: "wortschatz", severity: "medium", explanation: T(lang, `بنقول «haben» مع ${m[3]}: Ich habe Hunger / Durst / Angst / Zeit.`, `Use haben with ${m[3]}: Ich habe Hunger.`) },
      };
    },
  },
  // "ich müde" → "ich bin müde" (no verb "to be", like an Arabic nominal sentence)
  {
    apply(text, lang) {
      const m = text.match(/(^|[.!?]\s*)(ich|du|wir)\s+(müde|krank|glücklich|traurig|fertig|zufrieden|nervös|verheiratet|ledig)\b(?!\s+(bin|bist|sind))/i);
      if (!m) return null;
      const verb = ({ ich: "bin", du: "bist", wir: "sind" } as Record<string, string>)[m[2].toLowerCase()];
      const wrong = `${m[2]} ${m[3]}`;
      const right = `${m[2]} ${verb} ${m[3]}`;
      return {
        text: text.replace(wrong, right),
        fix: { wrong, right, tag: "konjugation", severity: "high", explanation: T(lang, "في الألماني لازم فعل sein في الجملة: Ich bin müde (مش «أنا تعبان» من غير فعل).", "German needs the verb sein here: Ich bin müde.") },
      };
    },
  },
  // Dative after mit/bei/von/zu/aus/nach/seit: "mit meine Lieben" → "mit meinen Lieben".
  {
    apply(text, lang) {
      const re = new RegExp(`\\b(${DAT_PREPS})\\s+(meine|deine|seine|ihre|unsere|eure|eine|keine|die|das|den)\\s+(\\p{L}+)`, "iu");
      const m = text.match(re);
      if (!m) return null;
      const det = dative(m[2], m[3]);
      if (!det || det === m[2].toLowerCase()) return null;
      const wrong = `${m[1]} ${m[2]}`;
      const right = `${m[1]} ${det}`;
      return {
        text: text.replace(wrong, right),
        fix: {
          wrong,
          right,
          tag: "dativ_akkusativ",
          severity: "medium",
          explanation: T(lang, `بعد «${m[1].toLowerCase()}» لازم داتيف: ${m[2]} ← ${det}.`, `"${m[1].toLowerCase()}" always takes the dative: ${m[2]} → ${det}.`),
        },
      };
    },
  },
  // Modal verb: the infinitive goes to the END. "ich möchte mit dir sprechen über X" → "… über X sprechen".
  {
    apply(text, lang) {
      const re = new RegExp(`\\b(${MODALS})\\b([^.?!,]*?)\\s([a-zäöüß]+en)\\s+([^.?!,]+)`, "i");
      const m = text.match(re);
      if (!m) return null;
      const inf = m[3];
      const rest = m[4].trim();
      if (NOT_INF.has(inf.toLowerCase()) || /^[a-zäöüß]+en$/.test(rest) || /^(und|aber|oder|weil|dass|wenn)\b/i.test(rest)) return null;
      if (/^(bitte|gern|gerne|auch|noch|jetzt|heute|morgen|sehr|mal)$/i.test(rest)) return null;
      const wrong = `${inf} ${rest}`;
      const right = `${rest} ${inf}`;
      return {
        text: text.replace(wrong, right),
        fix: { wrong, right, tag: "modalverben", severity: "high", explanation: T(lang, `مع فعل مودال (${m[1]}) الفعل التاني «${inf}» بيروح آخر الجملة.`, `With a modal verb (${m[1]}) the second verb "${inf}" goes to the end.`) },
      };
    },
  },
  // Perfekt of movement verbs with sein.
  {
    apply(text, lang) {
      const m = text.match(new RegExp(`\\b(habe|hast|hat|haben)\\b([^.?!]*?)\\b(${SEIN_VERBS})\\b`, "i"));
      if (!m) return null;
      const verb = ({ habe: "bin", hast: "bist", hat: "ist", haben: "sind" } as Record<string, string>)[m[1].toLowerCase()];
      const wrong = `${m[1]}${m[2]}${m[3]}`;
      const right = `${verb}${m[2]}${m[3]}`;
      return {
        text: text.replace(wrong, right),
        fix: { wrong, right, tag: "perfekt", severity: "medium", explanation: T(lang, `أفعال الحركة وتغيير الحالة (${m[3]}) بتاخد sein في الـ Perfekt.`, `Verbs of movement/change (${m[3]}) take sein in the Perfekt.`) },
      };
    },
  },
  // Separable verbs not separated.
  {
    apply(text, lang) {
      const m = text.match(new RegExp(`\\b(ich)\\s+(${Object.keys(SEPARABLE).join("|")})\\b([^.?!]*)`, "i"));
      if (!m) return null;
      const [verb, prefix] = SEPARABLE[m[2].toLowerCase()];
      const wrong = `${m[2]}${m[3]}`.trim();
      const right = `${verb}${m[3].trimEnd()} ${prefix}`.replace(/\s+/g, " ").trim();
      return {
        text: text.replace(wrong, right),
        fix: { wrong, right, tag: "trennbare_verben", severity: "medium", explanation: T(lang, `الفعل المنفصل بيتقسم: «${prefix}» بيروح آخر الجملة.`, `Separable verb: "${prefix}" goes to the end.`) },
      };
    },
  },
  // Verb at the end after weil/dass/wenn/ob.
  {
    apply(text, lang) {
      const m = text.match(/\b(weil|dass|wenn|ob)\s+(ich|du|er|sie|es|wir|ihr)\s+(bin|bist|ist|sind|habe|hast|hat|haben|kann|muss|will|möchte|gehe|arbeite|wohne|mag|lerne)\b([^.?!,]*)/i);
      if (!m || !m[4].trim()) return null;
      const wrong = m[0];
      const right = `${m[1]} ${m[2]}${m[4].trimEnd()} ${m[3]}`.replace(/\s+/g, " ");
      return {
        text: text.replace(wrong, right),
        fix: { wrong, right, tag: "verb_position", severity: "medium", explanation: T(lang, `بعد «${m[1]}» الفعل المصرّف بيروح آخر الجملة.`, `After "${m[1]}" the conjugated verb goes to the end.`) },
      };
    },
  },
  // ich + wrong verb form.
  {
    apply(text, lang) {
      const forms: Record<string, string> = { ist: "bin", bist: "bin", sind: "bin", hat: "habe", hast: "habe", kommt: "komme", arbeitet: "arbeite", wohnt: "wohne", macht: "mache", lernt: "lerne", spricht: "spreche" };
      const m = text.match(new RegExp(`\\b(ich)\\s+(${Object.keys(forms).join("|")})\\b`, "i"));
      if (!m) return null;
      const right = `${m[1]} ${forms[m[2].toLowerCase()]}`;
      return {
        text: text.replace(m[0], right),
        fix: { wrong: m[0], right, tag: "konjugation", severity: "high", explanation: T(lang, "مع ich الفعل بيتصرّف كده: ich bin, ich habe, ich komme, ich arbeite.", "With ich: ich bin, ich habe, ich komme, ich arbeite.") },
      };
    },
  },
];

/** Apply all rules (each at most twice) and return the corrected sentence plus every fix. */
export function ruleCorrect(original: string, lang: Lang = "ar"): { corrected: string; fixes: Fix[] } {
  let text = original.trim();
  const fixes: Fix[] = [];
  for (const rule of RULES) {
    for (let i = 0; i < 2; i++) {
      const r = rule.apply(text, lang);
      if (!r || r.text === text) break;
      text = r.text;
      fixes.push(r.fix);
    }
  }
  return { corrected: text.replace(/\s+/g, " ").trim(), fixes };
}
