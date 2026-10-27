// Offline stand-in for Claude. Used when ANTHROPIC_API_KEY is missing (or LLM_PROVIDER=mock),
// in tests and for the demo seed. Replies are canned but level-appropriate, never repeat a reply
// already given in the conversation, react to keywords, and answer grammar questions with
// pre-written explanations.

import { detectIntent } from "../intent";
import { EXPLANATIONS } from "./mockExplanations";
import { LEVEL_KNOWLEDGE } from "../levelKnowledge";
import { LEVEL_CONFIG, LEVELS, type Level } from "../levels";
import { START_SIGNAL } from "../prompts";
import { buildMockReport } from "../report/mockReport";
import type { ReportContext } from "../report/context";
import { withJsonRetries } from "./json";
import type { ChatParams, JsonParams, LLM } from "./types";

const GREETINGS: Record<Level, string[]> = {
  A1: ["Hallo! Ich bin Lena. Wie heißt du?", "Guten Tag! Ich heiße Lena. Wie geht es dir?"],
  A2: ["Hey, ich bin Jonas! Schön, dass du da bist. Wie war dein Tag bis jetzt?", "Hallo, ich bin Jonas aus Köln! Was hast du heute schon gemacht?"],
  B1: ["Hallo, ich bin Mira, ich arbeite hier in der Logistik. Worüber möchtest du heute sprechen?", "Hi, ich bin Mira! Ich hole mir gerade einen Kaffee. Wie läuft deine Woche bisher?"],
  B2: ["Guten Tag, Tobias Wendt. Freut mich, Sie kennenzulernen. Womit beschäftigen Sie sich beruflich?", "Guten Tag, mein Name ist Tobias Wendt. Ich bin Unternehmensberater in Berlin. Was führt Sie zu diesem Gespräch?"],
};

// Keyword reactions first, then the general pool.
export const TOPIC_REPLIES: Record<Level, { match: RegExp; replies: string[] }[]> = {
  A1: [
    { match: /arbeit|beruf|job|ingenieur|firma/i, replies: ["Oh, super! Arbeitest du gern?", "Interessant! Ist deine Arbeit schwer?"] },
    { match: /familie|bruder|schwester|kinder|mutter|vater/i, replies: ["Schön! Ist deine Familie groß?", "Toll! Wie heißt deine Mutter?"] },
    { match: /essen|kochen|pizza|kaffee|tee|frühstück/i, replies: ["Lecker! Was isst du gern zum Frühstück?", "Mmh! Kochst du jeden Tag?"] },
    { match: /ägypten|kairo|alexandria|komme aus/i, replies: ["Toll! Ist es in Kairo warm?", "Ägypten ist sehr schön. Wohnst du in einer großen Stadt?"] },
    { match: /heiße|mein name/i, replies: ["Freut mich! Woher kommst du?", "Schöner Name! Wie alt bist du?"] },
  ],
  A2: [
    { match: /arbeit|beruf|job|firma|kollegen|kunde/i, replies: ["Klingt interessant! Was hast du heute bei der Arbeit gemacht?", "Und wie sind deine Kollegen so?"] },
    { match: /wochenende|samstag|sonntag/i, replies: ["Cool! Was machst du am Wochenende am liebsten?", "Schön! Was hast du letztes Wochenende gemacht?"] },
    { match: /reise|urlaub|fahren|fliegen|meer/i, replies: ["Oh, schön! Wohin bist du zuletzt gereist?", "Super! Reist du lieber allein oder mit Freunden?"] },
    { match: /deutsch|lernen|kurs/i, replies: ["Super, dass du Deutsch lernst! Warum lernst du Deutsch?", "Was ist für dich beim Deutschlernen am schwierigsten?"] },
  ],
  B1: [
    { match: /arbeit|projekt|kunde|meeting|chef/i, replies: ["Das kenne ich gut. Wie gehst du mit stressigen Tagen bei der Arbeit um?", "Klingt nach viel Arbeit! Wie ist die Stimmung im Team gerade?"] },
    { match: /deutschland|umziehen|ausland/i, replies: ["Spannend! Was würdest du in Deutschland am meisten vermissen?", "Was reizt dich an einem Job in Deutschland?"] },
    { match: /hobby|sport|wandern|lesen|podcast/i, replies: ["Schön! Wie bist du zu diesem Hobby gekommen?", "Das mache ich auch gern! Wie oft findest du Zeit dafür?"] },
  ],
  B2: [
    { match: /homeoffice|remote|büro/i, replies: ["Interessant. Aber leidet nicht die Teamkultur, wenn alle von zu Hause arbeiten? Wie sehen Sie das?"] },
    { match: /kunde|verhandlung|preis|angebot/i, replies: ["Verstehe. Wie würden Sie reagieren, wenn der Kunde den Preis für überzogen hält?"] },
    { match: /arbeit|beruf|projekt|firma/i, replies: ["Das klingt nach viel Verantwortung. Was war bisher Ihre größte berufliche Herausforderung?"] },
  ],
};

export const CHAT_POOL: Record<Level, string[]> = {
  A1: [
    "Ah, interessant! Was machst du gern am Abend?",
    "Schön! Hast du Geschwister?",
    "Super! Wo arbeitest du?",
    "Oh, toll! Was isst du gern?",
    "Das finde ich gut. Trinkst du lieber Kaffee oder Tee?",
    "Ich verstehe. Wie ist das Wetter heute bei dir?",
    "Prima! Was machst du am Wochenende?",
    "Ach so! Wohnst du in einer Wohnung oder in einem Haus?",
    "Sehr gut! Welche Sprachen sprichst du?",
    "Ich lese gern Bücher. Und du? Liest du gern?",
    "Hamburg ist sehr schön. Kennst du Deutschland?",
    "Ich koche oft Suppe. Kochst du auch gern?",
    "Wunderbar! Wie spät ist es jetzt bei dir?",
    "Interessant! Hast du ein Lieblingsessen?",
    "Ich fahre gern Fahrrad. Machst du Sport?",
    "Das ist schön. Wer ist in deiner Familie?",
    "Toll! Was ist dein Hobby?",
    "Ich mag Musik sehr. Welche Musik hörst du?",
    "Gut! Wann stehst du am Morgen auf?",
    "Ich gehe heute einkaufen. Was kaufst du oft?",
    "Schön! Ist dein Büro groß oder klein?",
    "Okay! Fährst du mit dem Bus oder mit dem Auto?",
  ],
  A2: [
    "Echt? Das ist ja spannend! Wie bist du darauf gekommen?",
    "Das kenne ich! Was hast du danach gemacht?",
    "Cool! Wie lange machst du das schon?",
    "Ach so, verstehe. Und wie war das für dich?",
    "Interessant! Gibt es so etwas auch in Ägypten?",
    "Ich war letztes Jahr in Spanien. Bist du schon mal ins Ausland gereist?",
    "Super! Was kochst du am liebsten?",
    "Bei uns im Laden war heute viel los. Wie war dein Tag?",
    "Das klingt anstrengend! Was machst du, wenn du müde bist?",
    "Haha, das passiert mir auch oft! Was hast du dann gesagt?",
    "Schön! Mit wem machst du das am liebsten?",
    "Ich gucke gerade eine lustige Serie. Welche Serien magst du?",
    "Am Samstag spiele ich Fußball mit Freunden. Spielst du auch?",
    "Das finde ich mutig! Warum hast du dich dafür entschieden?",
    "Klingt lecker! Wie kocht man das?",
    "Oh, das wusste ich nicht! Wie funktioniert das genau?",
    "Ich glaube, das ist nicht so einfach. Was ist für dich am schwierigsten?",
    "Gestern habe ich meinem Kollegen geholfen. Hilfst du auch oft anderen Leuten?",
    "Das ist eine gute Idee! Wann möchtest du das machen?",
    "Ich trinke morgens immer zwei Kaffee. Wie fängt dein Tag an?",
    "Wirklich? Was haben deine Freunde dazu gesagt?",
    "Köln ist im Sommer wunderschön. Welche Stadt in Deutschland möchtest du sehen?",
  ],
  B1: [
    "Das kann ich gut nachvollziehen. Wie bist du mit der Situation umgegangen?",
    "Spannend! Was hat dich daran am meisten überrascht?",
    "Ehrlich gesagt geht es mir manchmal ähnlich. Was hilft dir, wenn du gestresst bist?",
    "Das klingt nach einer guten Erfahrung. Würdest du das noch einmal machen?",
    "Interessant, darüber habe ich noch nie nachgedacht. Wie ist das in Ägypten?",
    "Bei uns im Team diskutieren wir gerade über ein ähnliches Thema. Was ist deine Meinung dazu?",
    "Oh, das hätte ich nicht gedacht! Woran liegt das deiner Meinung nach?",
    "Ich finde, du hast das sehr gut gelöst. Was würdest du beim nächsten Mal anders machen?",
    "Das erinnert mich an meinen ersten Job in München. Wie war dein erster Arbeitstag?",
    "Klingt anstrengend, aber auch lehrreich. Was hast du daraus gelernt?",
    "Am Wochenende war ich wandern, obwohl es geregnet hat. Was machst du, um abzuschalten?",
    "Ich höre gerade einen Podcast über Arbeit im Ausland. Was reizt dich an einem Job in Deutschland?",
    "Da hast du recht, das ist nicht immer einfach. Wie sieht ein typischer Tag bei dir aus?",
    "Das finde ich eine gute Einstellung. Welche Ziele hast du für dieses Jahr?",
    "Wirklich? Das musst du mir genauer erklären. Wie funktioniert das bei euch?",
    "Ich verstehe, was du meinst. Siehst du auch Vorteile?",
    "Klingt, als hättest du viel Verantwortung. Macht dir das Spaß?",
    "Gute Frage, darüber streiten wir in der Kaffeeküche oft. Was denkst du selbst?",
    "Mein Chef sagt immer, dass Kommunikation das Wichtigste ist. Siehst du das auch so?",
    "Das ist ein wichtiger Punkt. Wie reagieren deine Kollegen darauf?",
    "Echt, das wusste ich nicht! Seit wann ist das so?",
    "Hast du schon mal überlegt, eine Weiterbildung zu machen?",
  ],
  B2: [
    "Ein nachvollziehbarer Standpunkt. Welche Argumente sprechen Ihrer Meinung nach dagegen?",
    "Das überzeugt mich noch nicht ganz. Können Sie ein konkretes Beispiel nennen?",
    "Interessant, aber wie würden Sie das einem skeptischen Vorgesetzten erklären?",
    "Da muss ich Ihnen teilweise widersprechen: Kurzfristig mag das stimmen, langfristig sehe ich Risiken. Wie schätzen Sie das ein?",
    "Das ist ein wichtiger Aspekt, der oft unterschätzt wird. Welche Konsequenzen hätte das für Ihr Team?",
    "Lassen Sie mich bewusst dagegenhalten: Was wäre, wenn das Budget um die Hälfte gekürzt würde?",
    "Spannend. Wie hat sich Ihre Sicht darauf in den letzten Jahren verändert?",
    "Das erinnert mich an ein Projekt bei einem Zulieferer, bei dem genau das schiefgelaufen ist. Wie würden Sie so etwas verhindern?",
    "Ich verstehe Ihren Punkt. Aber ist das nicht eher eine Frage der Unternehmenskultur als der Technik?",
    "Angenommen, Sie hätten freie Hand: Was würden Sie als Erstes ändern?",
    "Das klingt plausibel. Welche Erfahrungen stützen diese Einschätzung?",
    "Gute Frage. Bevor ich antworte: Wie würden Sie selbst entscheiden?",
    "Da sind wir uns einig. Wo sehen Sie die größten Hürden bei der Umsetzung?",
    "Hand aufs Herz: Würden Sie das auch vertreten, wenn es Ihren eigenen Bonus beträfe?",
    "In Deutschland wird darüber sehr kontrovers diskutiert. Wie ist die Debatte in Ägypten?",
    "Das ist ein klassischer Zielkonflikt zwischen Kosten und Qualität. Wie würden Sie ihn auflösen?",
    "Interessanter Gedanke. Was würde ein Kunde dazu sagen?",
    "Ich sehe das ähnlich, allerdings mit einer Einschränkung: Die Kommunikation muss stimmen. Wie stellen Sie das sicher?",
    "Nehmen wir an, Sie präsentieren das morgen dem Vorstand. Mit welchem Argument würden Sie beginnen?",
    "Das klingt nach einer anspruchsvollen Situation. Wie sind Sie damit umgegangen?",
    "Erlauben Sie mir eine kritische Rückfrage: Ist das wirklich auf andere Abteilungen übertragbar?",
    "Sehr gut formuliert. Wie würden Sie Ihre Position in einem Satz zusammenfassen?",
  ],
};

export { EXPLANATIONS };

// Answers to questions about the partner (demo mode).
const PERSONA_QA: Record<Level, { match: RegExp; reply: string }[]> = {
  A1: [
    { match: /wie geht/, reply: "Mir geht es gut, danke! Ich trinke gerade Tee. Und wie geht es dir?" },
    { match: /wie heißt|dein name|ihr name/, reply: "Ich heiße Lena. Ich bin Lehrerin. Und wie heißt du?" },
    { match: /woher kommst|wo wohnst|woher kommen|wo wohnen/, reply: "Ich komme aus Hamburg. Hamburg ist groß und schön. Und woher kommst du?" },
    { match: /beruf|arbeitest du|was machst du|arbeiten sie/, reply: "Ich bin Deutschlehrerin. Ich arbeite gern mit Menschen. Was ist dein Beruf?" },
    { match: /wie alt/, reply: "Ich bin zweiundfünfzig Jahre alt. Und wie alt bist du?" },
  ],
  A2: [
    { match: /wie geht/, reply: "Danke, mir geht's super! Heute war viel los im Laden. Und bei dir?" },
    { match: /wie heißt|dein name/, reply: "Ich heiße Jonas und komme aus Köln. Und du, wie heißt du?" },
    { match: /woher kommst|wo wohnst/, reply: "Ich wohne in Köln, direkt am Rhein. Ich mag die Stadt sehr. Wo wohnst du?" },
    { match: /beruf|arbeitest du|was machst du/, reply: "Ich arbeite in einem Fahrradladen und studiere Medien. Und was machst du beruflich?" },
    { match: /wie alt/, reply: "Ich bin siebenundzwanzig. Und du?" },
  ],
  B1: [
    { match: /wie geht/, reply: "Danke, gut! Die Woche ist ziemlich voll, aber heute ist es ruhiger. Wie läuft es bei dir?" },
    { match: /wie heißt|dein name/, reply: "Ich bin Mira, ich arbeite in der Logistik hier in München. Und wie heißt du?" },
    { match: /woher kommst|wo wohnst/, reply: "Ich wohne in München, ursprünglich komme ich aber aus Leipzig. Wo lebst du gerade?" },
    { match: /beruf|arbeitest du|was machst du/, reply: "Ich bin Projektkoordinatorin, das heißt, ich plane Lieferungen und spreche viel mit Kunden. Was machst du beruflich?" },
  ],
  B2: [
    { match: /wie geht/, reply: "Danke der Nachfrage, sehr gut. Ich komme gerade aus einer langen Verhandlung. Und wie geht es Ihnen?" },
    { match: /wie heißen|ihr name/, reply: "Tobias Wendt, ich bin Unternehmensberater in Berlin. Mit wem habe ich das Vergnügen?" },
    { match: /woher kommen|wo wohnen/, reply: "Ich lebe in Berlin, bin aber in Hannover aufgewachsen. Wo leben Sie zurzeit?" },
    { match: /beruf|arbeiten sie|was machen sie/, reply: "Ich berate mittelständische Unternehmen bei Strategie und Verhandlungen. Und in welcher Branche sind Sie tätig?" },
  ],
};

// Replies that pick up a word from what the learner said ({K}), so the partner reacts to the content.
const CONTENT_REPLIES: Record<Level, string[]> = {
  A1: ["{K}? Oh, interessant! Erzähl mir mehr, bitte.", "Ah, {K}! Das finde ich gut. Was magst du daran?", "Hmm, {K}. Was meinst du genau?"],
  A2: ["Echt, {K}? Das klingt spannend! Erzähl mal mehr darüber.", "Ach so, {K}! Wie bist du darauf gekommen?", "{K} finde ich auch interessant. Was ist für dich daran wichtig?"],
  B1: ["Ah, {K}! Darüber habe ich neulich auch nachgedacht. Wie ist deine Erfahrung damit?", "Stimmt, {K} ist ein spannendes Thema. Was genau meinst du damit?", "Das mit {K} kann ich gut verstehen. Erzähl mal, wie war das für dich?"],
  B2: ["{K} ist in der Tat ein interessanter Punkt. Was genau verstehen Sie darunter?", "Spannend, dass Sie {K} ansprechen. Welche Erfahrungen haben Sie damit gemacht?", "Bei {K} gehen die Meinungen ja auseinander. Wie positionieren Sie sich?"],
};
const QUESTION_REPLIES: Record<Level, string[]> = {
  A1: ["Gute Frage! Über {K} weiß ich nicht so viel. Was denkst du?", "Hmm, {K}? Das ist eine gute Frage. Was meinst du?"],
  A2: ["Hmm, gute Frage zu {K}! Ich bin nicht ganz sicher. Was weißt du darüber?", "Gute Frage! Zu {K} habe ich keine Antwort im Demo-Modus. Was denkst du?"],
  B1: ["Gute Frage! Zu {K} habe ich ehrlich gesagt keine feste Meinung. Was denkst du selbst?", "Hmm, {K} ist eine schwierige Frage. Wie würdest du sie beantworten?"],
  B2: ["Interessante Frage zu {K}. Im Demo-Modus kann ich darauf nur kurz eingehen. Wie sehen Sie das?", "Eine berechtigte Frage zu {K}. Was ist Ihre eigene Einschätzung?"],
};

const STOP = new Set(
  "ich du er sie es wir ihr mein dein sein ihr unser euer und oder aber denn weil dass wenn ob als wie was wer wo wann warum woher wohin welche welcher welches der die das den dem des ein eine einen einem einer eines kein keine nicht auch noch schon sehr gern gerne ja nein doch mal bitte danke heute morgen gestern jetzt hier dort dann also bin bist ist sind war habe hast hat haben hatte kann kannst können muss musst möchte möchten will willst mit von zu bei aus nach für auf in im am an um über unter vor hinter zwischen durch ohne gegen viel viele mehr sehr gut äh ähm hm okay genau so".split(" "),
);

/** The most "content-like" word of the learner's message: a noun if possible, else the longest word. */
export function contentKeyword(text: string): string | null {
  const words: string[] = text.match(/[\p{L}-]+/gu) ?? [];
  const candidates = words.filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()));
  // Capitalised words after the first one are nouns (speech recognition capitalises German nouns).
  const nouns = candidates.filter((w) => /^[A-ZÄÖÜ]/.test(w) && words.indexOf(w) > 0);
  return [...(nouns.length ? nouns : candidates)].sort((a, b) => b.length - a.length)[0] ?? null;
}

function levelFromSystem(system: string, fallback?: Level): Level {
  const m = system.match(/LEVEL: (A1|A2|B1|B2)/) ?? system.match(/level (A1|A2|B1|B2)/i);
  const l = m?.[1]?.toUpperCase();
  return (LEVELS as readonly string[]).includes(l ?? "") ? (l as Level) : (fallback ?? "A1");
}

/** First candidate (starting at a rotating offset) the partner hasn't said yet in this conversation. */
function fresh(candidates: string[], said: Set<string>, offset: number): string | null {
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[(offset + i) % candidates.length];
    if (!said.has(c)) return c;
  }
  return null;
}

export function mockPartnerReply(level: Level, messages: ChatParams["messages"]): string {
  const said = new Set(messages.filter((m) => m.role === "assistant").flatMap((m) => [m.content, ...m.content.split("\n")]));
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const turnNo = messages.filter((m) => m.role === "assistant").length;
  const offset = turnNo * 7 + lastUser.length;

  if (lastUser === START_SIGNAL) return fresh(GREETINGS[level], said, Math.floor(Math.random() * GREETINGS[level].length)) ?? GREETINGS[level][0];

  const { intent, topic } = detectIntent(lastUser);
  // Explanations are always given, also when the learner asks again — never deflect.
  if (intent === "explain") return EXPLANATIONS[level][topic ?? "generic"];
  const k = LEVEL_KNOWLEDGE[level].examples;
  if (intent === "opinion" && !said.has(k.opinion.partner)) return k.opinion.partner;
  if (intent === "story" && !said.has(k.story.partner)) return k.story.partner;

  const lower = lastUser.toLowerCase();
  const persona = PERSONA_QA[level].find((q) => q.match.test(lower));
  if (persona && !said.has(persona.reply)) return persona.reply;

  const keyword = TOPIC_REPLIES[level].find((r) => r.match.test(lastUser));
  const byKeyword = keyword ? fresh(keyword.replies, said, offset) : null;
  if (byKeyword) return byKeyword;

  // Otherwise react to the content: pick up a word the learner used.
  const kw = contentKeyword(lastUser);
  if (kw) {
    const templates = intent === "question" || intent === "opinion" || intent === "story" ? QUESTION_REPLIES[level] : CONTENT_REPLIES[level];
    const reply = fresh(templates.map((t) => t.replaceAll("{K}", kw)), said, offset);
    if (reply) return reply;
  }
  return fresh(CHAT_POOL[level], said, offset) ?? CHAT_POOL[level][offset % CHAT_POOL[level].length];
}

export class MockLLM implements LLM {
  provider = "mock" as const;

  async chat(p: ChatParams): Promise<string> {
    const level = p.level ?? levelFromSystem(p.system);
    let text: string;
    if (p.purpose === "summary") {
      text = "Earlier the learner talked about: " + p.messages.map((m) => m.content).join(" / ").slice(0, 400);
    } else if (p.purpose === "simplify") {
      // Demo mode can't rewrite: return the sentence unchanged. If it still fails the level check the
      // pipeline drops it — never replace content with an unrelated generic question.
      const prompt = p.messages.map((m) => m.content).join("\n");
      text = prompt.match(/Sentence: (.*)$/m)?.[1]?.trim() ?? "";
    } else {
      text = mockPartnerReply(level, p.messages);
    }
    // Simulate streaming so the UI path is the same as with the real model.
    if (p.onText) {
      for (const chunk of text.match(/.{1,16}/gs) ?? []) {
        if (p.signal?.aborted) break;
        p.onText(chunk);
        await new Promise((r) => setTimeout(r, 8));
      }
    }
    return text;
  }

  async json<T>(p: JsonParams<T>): Promise<T> {
    return withJsonRetries<T>(async () => {
      if (p.purpose === "check") return { ok: true, violations: [], simplified: null };
      if (p.purpose === "report") return buildMockReport(p.mockContext as ReportContext);
      if (p.purpose === "hint") {
        const ctx = (p.mockContext ?? {}) as { level?: Level; lang?: "ar" | "en"; partnerText?: string };
        const level = ctx.level ?? "A1";
        const ar = ctx.lang !== "en";
        return {
          meaning: ar
            ? `(وضع تجريبي بدون ذكاء اصطناعي) شريكك قال: «${ctx.partnerText ?? ""}» — غالباً بيسألك سؤال عنك.`
            : `(demo mode without AI) Your partner said: "${ctx.partnerText ?? ""}" — probably a question about you.`,
          hint: ar ? "جاوب بجملة قصيرة تبدأ بـ Ich … وبعدين اسأله سؤال بسيط." : "Answer with a short sentence starting with Ich …, then ask a simple question back.",
          rephrase: LEVEL_CONFIG[level].safeFallbacks[1] ?? LEVEL_CONFIG[level].safeFallbacks[0],
          starter: level === "A1" ? "Ich heiße … und ich komme aus …" : level === "A2" ? "Ich habe heute … gemacht." : "Ich finde, dass …",
        };
      }
      throw new Error(`Mock has no answer for ${p.purpose}`);
    }, p.schema);
  }
}
