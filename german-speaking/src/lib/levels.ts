// Everything that defines a level: colours, the grammar/vocabulary limits (for AI reading texts and
// writing corrections) and the voice defaults for listening. Shared by server and client.

export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];

export function isLevel(v: unknown): v is Level {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v);
}

export interface VoiceDefaults {
  /** Preferred browser voice for the level's sentences. */
  gender: "female" | "male";
  rate: number;
  pitch: number;
  preferLangs: string[]; // in order of preference
}

export interface LevelLimits {
  maxWordsPerSentence: number;
  maxSentences: number;
  /** Explanations, stories and opinions may be longer. */
  maxSentencesLong: number;
}

/** Names and descriptions live in messages/*.json (lvl_A1_name, lvl_A1_desc…). */
export interface LevelInfo {
  group: "grundlagen" | "aufbau";
}

export interface LevelConfig {
  level: Level;
  info: LevelInfo;
  accent: string; // hex, also exposed as CSS var
  accentSoft: string;
  voice: VoiceDefaults;
  limits: LevelLimits;
  allowedGrammar: string[];
  forbiddenGrammar: string[];
  vocabulary: string;
  allowedExamples: string[];
  forbiddenExamples: { sentence: string; why: string }[];
}

export const LEVEL_CONFIG: Record<Level, LevelConfig> = {
  A1: {
    level: "A1",
    info: {
      group: "grundlagen",
    },
    accent: "#059669",
    accentSoft: "#d1fae5",
    voice: { gender: "female", rate: 0.95, pitch: 1.12, preferLangs: ["de-DE", "de-AT", "de-CH"] },
    limits: { maxWordsPerSentence: 10, maxSentences: 3, maxSentencesLong: 10 },
    allowedGrammar: [
      "Präsens (present tense) of regular verbs, sein, haben",
      "W-Fragen (Wie? Was? Wo? Woher? Wann?) and Ja/Nein-Fragen",
      "Modal verb chunks: 'Ich möchte …', 'Kannst du …?'",
      "Nominativ and simple Akkusativ (einen/ein/eine, den)",
      "Personal and possessive pronouns (mein, dein)",
      "Connectors: und, aber, oder; at most one very simple 'weil' clause",
      "Negation: nicht, kein",
    ],
    forbiddenGrammar: [
      "Konjunktiv II (würde, hätte, wäre, könnte …) and Konjunktiv I",
      "Passiv in any form",
      "Präteritum and Perfekt (exception: 'Wie war …?' as a fixed chunk)",
      "Subordinate clauses other than a very simple 'weil' (no dass, wenn, ob, obwohl, damit, während, Relativsätze)",
      "Futur I, Plusquamperfekt",
      "Genitiv",
      "Idioms, slang, abstract nouns",
    ],
    vocabulary:
      "Only the ~600 most common everyday words: greetings, family, food and drink, numbers, time, days, weather, home, simple jobs, hobbies, city. Avoid compound nouns longer than two parts.",
    allowedExamples: [
      "Hallo! Ich bin Lena. Wie heißt du?",
      "Woher kommst du?",
      "Ich trinke gern Tee. Und du?",
      "Super! Was ist dein Beruf?",
      "Ich wohne in Hamburg. Das ist schön.",
    ],
    forbiddenExamples: [
      { sentence: "Wenn du möchtest, könnten wir über deine Arbeit sprechen.", why: "wenn-clause + Konjunktiv II" },
      { sentence: "Was hast du am Wochenende gemacht?", why: "Perfekt is above A1" },
      { sentence: "Das ist eine Frage, die mich sehr interessiert.", why: "Relativsatz" },
      { sentence: "Die Arbeitsbedingungen werden ständig verbessert.", why: "Passiv + abstract vocabulary" },
    ],
  },

  A2: {
    level: "A2",
    info: {
      group: "grundlagen",
    },
    accent: "#0284c7",
    accentSoft: "#e0f2fe",
    voice: { gender: "male", rate: 1.0, pitch: 0.98, preferLangs: ["de-AT", "de-DE", "de-CH"] },
    limits: { maxWordsPerSentence: 14, maxSentences: 4, maxSentencesLong: 10 },
    allowedGrammar: [
      "Präsens, Perfekt, Präteritum of sein/haben/Modalverben (war, hatte, konnte, musste, wollte)",
      "Modalverben (können, müssen, wollen, dürfen, sollen, möchten)",
      "Trennbare Verben (anrufen, einkaufen, aufstehen …)",
      "Simple Nebensätze with weil, dass, wenn, ob",
      "Dativ and Akkusativ basics, Wechselpräpositionen for places",
      "Comparison (größer als, am liebsten)",
      "Imperativ, polite chunk 'Könnten Sie …?' only in role-plays with customers",
    ],
    forbiddenGrammar: [
      "Konjunktiv II beyond fixed polite chunks (no 'Wenn ich … hätte, würde ich …')",
      "Passiv",
      "Relativsätze",
      "obwohl, damit, während, nachdem, bevor, indem, sodass",
      "Futur I as a tense (use Präsens + time word)",
      "Genitiv, Konjunktiv I, Partizipialkonstruktionen",
      "Abstract or academic vocabulary, idioms",
    ],
    vocabulary:
      "Common everyday vocabulary (~1300 words): shopping, travel, transport, work basics, appointments, family, health, free time, home. Explain or avoid rarer words.",
    allowedExamples: [
      "Cool! Was hast du am Wochenende gemacht?",
      "Ich bin gestern mit dem Fahrrad zur Arbeit gefahren.",
      "Ich glaube, dass Köln im Sommer sehr schön ist.",
      "Wann stehst du morgens auf?",
      "Ich kann heute nicht kommen, weil ich arbeiten muss.",
    ],
    forbiddenExamples: [
      { sentence: "Obwohl es regnete, sind wir spazieren gegangen.", why: "obwohl-clause is B1" },
      { sentence: "Das Fahrrad, das ich gekauft habe, ist rot.", why: "Relativsatz is B1" },
      { sentence: "Wenn ich mehr Zeit hätte, würde ich reisen.", why: "Konjunktiv II for hypotheses is B1" },
      { sentence: "Die Pakete werden morgen geliefert.", why: "Passiv is B1" },
    ],
  },

  B1: {
    level: "B1",
    info: {
      group: "aufbau",
    },
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
    voice: { gender: "female", rate: 1.05, pitch: 1.04, preferLangs: ["de-DE", "de-CH", "de-AT"] },
    limits: { maxWordsPerSentence: 20, maxSentences: 4, maxSentencesLong: 10 },
    allowedGrammar: [
      "Perfekt, Präteritum (common verbs), Futur I",
      "Nebensätze: weil, dass, wenn, ob, als, obwohl, damit, während, nachdem, bevor",
      "Relativsätze (Nominativ/Akkusativ/Dativ)",
      "Passiv Präsens (and simple Präteritum 'wurde gebaut')",
      "Konjunktiv II for wishes, advice, polite requests (würde, hätte, wäre, könnte, sollte)",
      "Infinitiv mit zu, um … zu",
      "Opinions: Ich finde, dass … / Meiner Meinung nach …",
    ],
    forbiddenGrammar: [
      "Partizipialkonstruktionen (erweiterte Partizipialattribute: 'die gestern verschickte Ware')",
      "Heavy Nominalstil (chains of -ung nouns, 'Durchführung der Umsetzung')",
      "Konjunktiv I / indirect speech with sei/habe",
      "Passiv mit Modalverben im Perfekt, Plusquamperfekt Passiv",
      "Advanced idioms, academic connectors (infolgedessen, nichtsdestotrotz, hinsichtlich)",
    ],
    vocabulary:
      "Everyday + working-life vocabulary (~2500 words): work tasks, meetings, colleagues, plans, experiences, media, health, housing, opinions. Avoid specialist jargon or explain it in simple words.",
    allowedExamples: [
      "Obwohl ich heute müde bin, freue ich mich auf das Meeting.",
      "Das ist der Kunde, der gestern angerufen hat.",
      "Wenn ich du wäre, würde ich den Chef direkt fragen.",
      "Die Ware wird morgen früh geliefert. Passt dir das?",
      "Was hast du gemacht, damit das Projekt pünktlich fertig wird?",
    ],
    forbiddenExamples: [
      { sentence: "Die von uns gestern verschickte Ware ist angekommen.", why: "erweitertes Partizipialattribut (B2+)" },
      { sentence: "Er sagte, er sei mit der Lösung zufrieden.", why: "Konjunktiv I (B2)" },
      { sentence: "Nach erfolgter Durchführung der Maßnahmenumsetzung …", why: "Nominalstil (C1)" },
      { sentence: "Nichtsdestotrotz sollten wir das Pferd nicht von hinten aufzäumen.", why: "C1 connector + idiom" },
    ],
  },

  B2: {
    level: "B2",
    info: {
      group: "aufbau",
    },
    accent: "#e11d48",
    accentSoft: "#ffe4e6",
    voice: { gender: "male", rate: 1.1, pitch: 0.86, preferLangs: ["de-DE", "de-CH", "de-AT"] },
    limits: { maxWordsPerSentence: 28, maxSentences: 5, maxSentencesLong: 10 },
    allowedGrammar: [
      "All tenses incl. Plusquamperfekt and Futur II where natural",
      "Passiv in all common forms incl. with Modalverben, Zustandspassiv",
      "Konjunktiv II (all uses) and basic Konjunktiv I for indirect speech",
      "Complex Nebensätze, Relativsätze with prepositions, je … desto, zwar … aber, sowohl … als auch",
      "Moderate Nominalisierung, simple Partizipialattribute",
      "Common idioms (auf den Punkt bringen, unter Druck stehen)",
    ],
    forbiddenGrammar: [
      "C1/C2 literary or highly academic style",
      "Long chains of Nominalstil, bureaucratic jargon",
      "Rare or archaic idioms, poetic word order",
      "Sentences longer than 28 words",
    ],
    vocabulary:
      "Professional and abstract vocabulary (~4000+ words): business, negotiation, society, technology, environment, career. Common idioms are fine; rare literary words are not.",
    allowedExamples: [
      "Das klingt überzeugend, aber wie würden Sie das gegenüber einem skeptischen Kunden begründen?",
      "Der Bericht hätte eigentlich schon letzte Woche abgeschickt werden müssen.",
      "Je mehr Verantwortung man übernimmt, desto wichtiger wird klare Kommunikation.",
      "Der Kunde meinte, das Angebot sei zu teuer. Was entgegnen Sie?",
    ],
    forbiddenExamples: [
      { sentence: "Ungeachtet der obwaltenden Umstände ließe sich mithin konstatieren, dass …", why: "C2 academic style" },
      { sentence: "Des Pudels Kern liegt freilich anderswo begraben.", why: "literary idiom, C1+" },
    ],
  },
};

