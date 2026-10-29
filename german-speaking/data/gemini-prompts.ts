// "Talk with Gemini": the instructions the learner copies into Gemini (gemini.google.com or the app, Gemini Live).
// The prompt itself is German with a few Arabic words; the texts around it are in messages/*.json.

export type GeminiLevel = "A1" | "A2" | "B1" | "B2";

export const GEMINI_URL = "https://gemini.google.com/app";

export const LEVEL_RULES: Record<GeminiLevel, string> = {
  A1: "Sehr kurze, einfache Sätze (max. 8–10 Wörter), Präsens, Grundwortschatz, langsam und klar. Keine Nebensätze außer weil/und/aber.",
  A2: "Einfache Sätze, Perfekt, Modalverben, trennbare Verben, einfache Nebensätze mit weil/dass/wenn, Alltagsthemen.",
  B1: "Zusammenhängend sprechen, Perfekt/Präteritum, Nebensätze (obwohl, damit, Relativsätze), Konjunktiv II für Wünsche und Ratschläge, Meinungen und Erfahrungen. Nichts über B1.",
  B2: "Flüssig und natürlich, komplexe Sätze, Passiv, Konjunktiv II, Nominalisierung in Maßen, Diskussion und Argumentation, gängige Redewendungen. Kein C1/C2-Stil.",
};

/** What the conversation is about: the whole level, one book topic, or one video. */
export type GeminiContext =
  | { kind: "level" }
  | { kind: "topic"; title_de: string; title_ar: string; vocab: string[]; grammar: string[] }
  | { kind: "video"; title: string }
  | { kind: "film"; title: string };

export const VOCAB_IN_PROMPT = 10;

export function topicPart(ctx: GeminiContext): string {
  if (ctx.kind === "topic") {
    const words = ctx.vocab.slice(0, VOCAB_IN_PROMPT).join(", ");
    const grammar = ctx.grammar.join(", ");
    return `Unser Thema: "${ctx.title_de}" (${ctx.title_ar}). Bleib bei diesem Thema. Nutze diese Wörter: ${words}. Übe mit mir besonders: ${grammar}.\n`;
  }
  if (ctx.kind === "video") return `Unser Thema ist das Video "${ctx.title}". Frag mich, was ich gesehen habe, und sprich mit mir über das Thema.\n`;
  if (ctx.kind === "film") return `Unser Thema ist der Film "${ctx.title}". Frag mich zuerst, ob ich den Film schon beendet habe. Wenn nicht, verrate keine Spoiler. Sprich mit mir über die Handlung bis zu meiner Stelle, die Figuren und meine Meinung.\n`;
  return "";
}

export function geminiPrompt(level: GeminiLevel, ctx: GeminiContext = { kind: "level" }): string {
  return `Du bist mein freundlicher Deutsch-Gesprächspartner. Ich bin Arabisch-Muttersprachler aus Ägypten und lerne Deutsch auf Niveau ${level}.

Regeln:
1. Sprich NUR auf Niveau ${level}. ${LEVEL_RULES[level]}
2. Antworte kurz (1–3 Sätze), damit ICH mehr spreche. Stelle am Ende immer eine Frage.
3. Wenn ich etwas frage (Grammatik, ein Wort, deine Meinung), antworte zuerst richtig darauf, mit Beispielen auf meinem Niveau, dann sprich weiter.
4. Korrigiere mich sanft: wiederhole meinen Satz richtig in deiner Antwort. Unterbrich mich nicht.
5. Wenn ich "مش فاهم" oder "Hilfe" sage, erkläre es kurz auf Ägyptisch-Arabisch und dann weiter auf Deutsch.
6. Wenn ich "Bericht" sage: schreib einen kurzen Bericht auf Arabisch: meine Fehler (falsch → richtig + Erklärung), was gut war, und 3 Tipps.
${topicPart(ctx)}
Fang jetzt an: Begrüße mich kurz und frag mich, worüber ich sprechen möchte.
`;
}
