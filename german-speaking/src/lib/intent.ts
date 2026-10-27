// What does the learner want from this turn? Normal chat turns stay short so the learner talks
// more; explanations, stories and opinions may be longer (still at the partner's level).

export type Intent = "chat" | "explain" | "story" | "opinion";

export type GrammarTopic =
  | "modalverben"
  | "perfekt"
  | "trennbar"
  | "kasus"
  | "artikel"
  | "nebensatz"
  | "konjunktiv"
  | "passiv"
  | "praeteritum";

const TOPICS: [GrammarTopic, RegExp][] = [
  ["modalverben", /modalverb|modal verb/i],
  ["perfekt", /perfekt|partizip/i],
  ["trennbar", /trennbar/i],
  ["kasus", /dativ|akkusativ|nominativ|genitiv|kasus|fälle/i],
  ["artikel", /artikel|der,? die,? das|der die das/i],
  ["konjunktiv", /konjunktiv|indirekte rede/i],
  ["passiv", /passiv/i],
  ["praeteritum", /präteritum|praeteritum|imperfekt/i],
  ["nebensatz", /nebensatz|nebensätze|relativsatz|relativsätze|wortstellung|satzstellung/i],
];

const EXPLAIN =
  /erklär|erklaer|was (ist|sind|bedeutet|heißt|heisst) (das|der|die|ein|eine|denn|eigentlich)?|wie (benutzt|verwendet|bildet|sagt) man|grammatik|unterschied zwischen|welche regel|die regel|warum sagt man|explain/i;
// Vocabulary questions: "Was bedeutet Feierabend?", "Wie sagt man … auf Deutsch?"
const VOCAB = /was (bedeutet|heißt|heisst)|wie sagt man|was ist (ein|eine) [\wäöüß]+\s*\?/i;
const OPINION =
  /meinung|was (denkst|denken|hältst|haltet|halten) (du|sie|ihr)|(findest|finden) (du|sie)|wie (findest|finden) (du|sie)|was ist (dir|ihnen) lieber|vorteile|nachteile|pro und contra|einverstanden|stimmst du|stimmen sie/i;
const STORY = /erzähl|erzaehl|geschichte|(hast|haben) (du|sie) (schon mal|schon einmal|mal)|was ist (dir|ihnen) passiert|wie war (dein|ihr)|erlebt/i;

export function detectIntent(text: string): { intent: Intent; topic: GrammarTopic | null } {
  const t = text.toLowerCase();
  const topic = TOPICS.find(([, re]) => re.test(t))?.[0] ?? null;
  const asksExplain = EXPLAIN.test(t) || (topic !== null && /\?|bitte|kannst|können|könnten/.test(t));
  if (asksExplain && topic) return { intent: "explain", topic };
  if (EXPLAIN.test(t) && /erklär|erklaer|grammatik|regel|unterschied|explain/.test(t)) return { intent: "explain", topic };
  if (VOCAB.test(t)) return { intent: "explain", topic: null };
  if (OPINION.test(t)) return { intent: "opinion", topic: null };
  if (STORY.test(t)) return { intent: "story", topic: null };
  return { intent: "chat", topic: null };
}
