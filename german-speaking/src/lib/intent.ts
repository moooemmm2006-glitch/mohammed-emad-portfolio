// What does the learner want from this turn? The partner must answer that first.
// Normal chat turns stay short so the learner talks more; explanations, stories, opinions and
// direct questions may be longer (still at the partner's level).

export type Intent = "chat" | "question" | "explain" | "story" | "opinion";

export type GrammarTopic =
  | "modalverben"
  | "trennbar"
  | "perfekt"
  | "praeteritum"
  | "dativ"
  | "akkusativ"
  | "artikel"
  | "wortstellung"
  | "nebensatz"
  | "adjektiv"
  | "konjunktiv"
  | "fragewoerter"
  | "passiv";

// Order matters: the first match wins ("Dativ und Akkusativ" → dativ, which explains both).
const TOPICS: [GrammarTopic, RegExp][] = [
  ["modalverben", /modal\s*-?\s*verb|können,? müssen|modal verbs?|الأفعال الناقصة|افعال المودال|أفعال المودال/],
  ["trennbar", /trennbar|getrennt|separable|الأفعال المنفصلة|الافعال المنفصلة/],
  ["perfekt", /perfekt|partizip/],
  ["praeteritum", /präteritum|praeteritum|prateritum|imperfekt/],
  ["dativ", /dativ/],
  ["akkusativ", /akkusativ|accusative/],
  ["artikel", /artikel|der,? die,? (oder )?das|genus|article/],
  ["wortstellung", /wortstellung|satzstellung|satzbau|position (2|zwei)|verb an (position|platz)|verbposition|word order/],
  ["nebensatz", /nebensatz|nebensätze|relativsatz|relativsätze|\bweil\b.*\bdass\b|weil[- ]?sätze|dass[- ]?sätze|mit weil|mit dass/],
  ["adjektiv", /adjektiv|endung/],
  ["konjunktiv", /konjunktiv|würde.*form|indirekte rede/],
  ["fragewoerter", /fragewort|fragewörter|w-fragen|w-wörter|w fragen/],
  ["passiv", /passiv/],
];

// Asking for an explanation, a meaning or a rule. Case-insensitive; many spoken variants.
// ("was ist / was sind" only counts together with a grammar topic — "Was ist dein Hobby?" is a normal question.)
const EXPLAIN =
  /erklär|erkläre|erklären|erklaer|was (bedeutet|bedeuten|heißt|heisst)\b|wie (benutzt|benutze|verwendet|verwende|bildet|bilde|sagt) (man|ich)|grammatik|unterschied zwischen|welche regel|die regel|warum sagt man|wann (benutzt|braucht|nimmt) man|kannst du mir .*(sagen|zeigen)|können sie mir .*(sagen|zeigen)|explain|what (is|are|does)|meaning|اشرح|إشرح|يعني ايه|يعني إيه|يعنى ايه|ازاي|إزاي|معنى|ايه هو|إيه هو|ايه الفرق|إيه الفرق|قاعدة/;
const OPINION =
  /meinung|was (denkst|denken|hältst|haltet|halten) (du|sie|ihr)|(findest|finden) (du|sie)|wie (findest|finden) (du|sie)|was ist (dir|ihnen) lieber|vorteile|nachteile|pro und contra|einverstanden|stimmst du|stimmen sie|rat(schlag)?\b|tipp|was soll ich|was würdest du|was würden sie/;
const STORY = /erzähl|erzaehl|geschichte|witz|(hast|haben) (du|sie) (schon mal|schon einmal|mal)|was ist (dir|ihnen) passiert|wie war (dein|ihr)|erlebt/;
const QUESTION_START =
  /^(wer|was|wann|wo|wohin|woher|wie|warum|wieso|weshalb|welche[rsmn]?|kannst|können|könntest|könnten|hast|haben|bist|sind|magst|mögen|weißt|wissen|gibt es|ist|darf|soll|willst|wollen|machst|machen|findest)\b/;

export function hasArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

export function detectTopic(text: string): GrammarTopic | null {
  const t = text.toLowerCase();
  return TOPICS.find(([, re]) => re.test(t))?.[0] ?? null;
}

export function detectIntent(text: string): { intent: Intent; topic: GrammarTopic | null } {
  const t = text.toLowerCase().trim();
  const topic = detectTopic(t);
  const isQuestion = t.endsWith("?") || t.endsWith("؟") || QUESTION_START.test(t);
  // A grammar topic named in a question or request is always an explanation request.
  if (topic && (EXPLAIN.test(t) || isQuestion || /bitte|noch (ein)?mal|nochmal|mehr über/.test(t))) return { intent: "explain", topic };
  if (EXPLAIN.test(t)) return { intent: "explain", topic };
  if (OPINION.test(t)) return { intent: "opinion", topic: null };
  if (STORY.test(t)) return { intent: "story", topic: null };
  if (isQuestion) return { intent: "question", topic: null };
  return { intent: "chat", topic: null };
}
