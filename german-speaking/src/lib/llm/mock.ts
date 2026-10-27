// Offline stand-in for Claude. Used when ANTHROPIC_API_KEY is missing (or LLM_PROVIDER=mock),
// in tests and for the demo seed. Replies are canned but level-appropriate, never repeat a reply
// already given in the conversation, react to keywords, and answer grammar questions with
// pre-written explanations.

import { detectIntent, type GrammarTopic } from "../intent";
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

type ExplainKey = GrammarTopic | "generic";

// Pre-written explanations (demo mode). A1/A2 may contain one short Arabic hint in brackets.
export const EXPLANATIONS: Record<Level, Partial<Record<ExplainKey, string>>> = {
  A1: {
    modalverben: LEVEL_KNOWLEDGE.A1.examples.explain.partner,
    perfekt:
      "Das Perfekt ist für gestern und letzte Woche. Man braucht haben oder sein (فعل مساعد). Das zweite Verb kommt ans Ende. Ich habe Pizza gegessen. Ich bin nach Hause gegangen. Das lernen wir genau bei A2. Was isst du heute?",
    trennbar:
      "Trennbare Verben haben zwei Teile, zum Beispiel aufstehen. Der kleine Teil geht ans Ende (الجزء الصغير بيروح آخر الجملة). Ich stehe um sieben Uhr auf. Ich kaufe heute ein. Ich rufe meine Mutter an. Jetzt du: Wann stehst du auf?",
    kasus:
      "Gute Frage! Bei A1 ist der Akkusativ wichtig. Nur der ändert sich: der wird den oder einen. Ich trinke einen Kaffee. Ich sehe den Bus. Die und das bleiben gleich. Den Dativ lernen wir später. Was trinkst du gern?",
    artikel:
      "Jedes Nomen hat einen Artikel: der, die oder das. Lern das Nomen immer mit Artikel (احفظ الاسم مع الأداة). Der Tisch, die Tür, das Buch. Es gibt leider keine einfache Regel. Wörter auf -ung sind immer die: die Zeitung. Welches Wort möchtest du lernen?",
    generic: "Gute Frage! Ich erkläre es gern einfach. Sag mir bitte ein Beispiel. Dann sprechen wir zusammen darüber. Welches Wort ist schwer für dich?",
  },
  A2: {
    modalverben:
      "Gern! Modalverben sind können, müssen, wollen, dürfen, sollen und möchten. Das Modalverb steht auf Platz zwei und ändert sich. Das zweite Verb steht im Infinitiv ganz am Ende. Ich muss heute lange arbeiten. Darf ich hier parken? Bei der Arbeit sagt man oft: Können Sie mir helfen? Jetzt du: Was musst du diese Woche machen?",
    perfekt: LEVEL_KNOWLEDGE.A2.examples.explain.partner,
    trennbar:
      "Trennbare Verben wie anrufen, einkaufen oder aufstehen haben ein Präfix. Im Präsens steht das Präfix am Ende: Ich rufe den Kunden an. Im Perfekt kommt ge in die Mitte: Ich habe den Kunden angerufen. Mit Modalverb bleibt das Verb zusammen am Ende: Ich muss morgen früh aufstehen. Jetzt du: Wann bist du heute aufgestanden?",
    kasus:
      "Gute Frage! Bei der Frage wo kommt der Dativ: Ich arbeite im Büro. Bei der Frage wohin kommt der Akkusativ: Ich gehe ins Büro. Nach mit, bei, von und zu kommt immer Dativ: mit dem Bus. Akkusativ ist oft das Ding, das man kauft: Ich kaufe einen Laptop. Jetzt du: Wohin fährst du am Wochenende?",
    artikel:
      "Der, die oder das musst du leider mit jedem Nomen lernen. Es gibt aber ein paar Tipps. Wörter auf -ung, -heit und -keit sind immer die: die Zeitung, die Freiheit. Wörter auf -chen sind immer das: das Mädchen. Im Dativ wird der zu dem und die zu der. Welches Wort ist für dich schwer?",
    generic: "Gute Frage! Ich erkläre es dir gern. Sag mir bitte einen Beispielsatz. Dann zeige ich dir die Regel daran. Welcher Satz ist für dich schwierig?",
  },
  B1: {
    modalverben:
      "Klar! Modalverben wie können, müssen, dürfen, sollen, wollen und möchten zeigen, ob etwas möglich, nötig oder erlaubt ist. Das Modalverb steht auf Position zwei, das andere Verb im Infinitiv am Ende. Im Nebensatz steht das Modalverb ganz am Ende: Ich weiß, dass ich morgen früher kommen muss. Für die Vergangenheit benutzt man meistens das Präteritum: Ich musste gestern lange arbeiten. Ein typischer Fehler ist: Ich kann sprechen Deutsch. Richtig ist: Ich kann Deutsch sprechen. Probier mal: Was durftest du als Kind nicht machen?",
    perfekt:
      "Das Perfekt benutzt man vor allem, wenn man über die Vergangenheit spricht. Man bildet es mit haben oder sein auf Position zwei und dem Partizip am Ende. Sein nimmt man bei Bewegung und Veränderung, zum Beispiel gehen, fahren, aufstehen oder einschlafen. Ich habe gestern einen Bericht geschrieben, dann bin ich nach Hause gefahren. Beim Schreiben benutzt man öfter das Präteritum. Erzähl mal: Was hast du am Wochenende erlebt?",
    trennbar:
      "Trennbare Verben bestehen aus einem Präfix und einem Verb, zum Beispiel anrufen oder vorbereiten. Im Hauptsatz steht das Präfix am Ende: Ich bereite die Präsentation vor. Im Nebensatz bleibt das Verb zusammen: Ich weiß, dass er morgen anruft. Im Perfekt steht ge in der Mitte: Ich habe den Kunden angerufen. Bei zu steht zu auch in der Mitte: Ich habe vergessen, ihn anzurufen. Was bereitest du gerade vor?",
    kasus: LEVEL_KNOWLEDGE.B1.examples.explain.partner,
    artikel:
      "Leider muss man die Artikel meistens zusammen mit dem Nomen lernen. Es gibt aber hilfreiche Regeln: Wörter auf -ung, -heit, -keit und -ion sind feminin, also die. Wörter auf -chen und -lein sind immer neutral, also das. Männliche Personen und Wochentage sind meistens der. Ein guter Trick ist, neue Wörter immer mit Artikel und Farbe aufzuschreiben. Welches Wort möchtest du gerade lernen?",
    generic:
      "Gute Frage! Gib mir am besten ein Beispiel aus deinem Alltag, dann erkläre ich es dir daran. So kann man sich die Regel viel leichter merken. Welcher Satz macht dir Probleme?",
  },
  B2: {
    modalverben:
      "Gern. Modalverben drücken Möglichkeit, Notwendigkeit, Erlaubnis oder Absicht aus, also können, müssen, dürfen, sollen, wollen und mögen. Interessant wird es im Perfekt: Dort steht der Infinitiv statt des Partizips, etwa: Ich habe gestern nicht kommen können. Im Nebensatz steht das Hilfsverb dann sogar vor den beiden Infinitiven: weil ich nicht habe kommen können. Außerdem haben einige Modalverben eine subjektive Bedeutung, zum Beispiel: Er soll sehr kompetent sein, also man sagt es. Können Sie einen Satz mit einer solchen Bedeutung bilden?",
    perfekt:
      "Das Perfekt ist im gesprochenen Deutsch die Standardform für die Vergangenheit, während das Präteritum eher in schriftlichen Texten vorkommt. Ausnahmen sind sein, haben und die Modalverben, die man auch mündlich meist im Präteritum verwendet. Mit sein bilden das Perfekt vor allem Verben der Bewegung und der Zustandsveränderung, etwa: Der Umsatz ist deutlich gestiegen. Wie würden Sie Ihren letzten Arbeitstag im Perfekt zusammenfassen?",
    trennbar:
      "Bei trennbaren Verben rückt das Präfix im Hauptsatz ans Satzende, etwa: Wir schließen das Projekt nächste Woche ab. Im Nebensatz bleibt das Verb zusammen, und beim Infinitiv mit zu steht zu in der Mitte: Es ist wichtig, die Frist einzuhalten. Achtung: Manche Präfixe wie über, unter oder um können trennbar oder untrennbar sein und ändern dann die Bedeutung. Können Sie einen Satz mit einhalten oder abschließen bilden?",
    kasus:
      "Grob gesagt markiert der Akkusativ das direkte Objekt, während der Dativ meist den Empfänger einer Handlung bezeichnet. Bei Verben wie geben, schicken oder erklären haben Sie oft beides: Ich erkläre dem Kunden die neuen Konditionen. Wechselpräpositionen folgen der Logik Ort oder Richtung: Das Dokument liegt auf dem Tisch, aber ich lege es auf den Tisch. Wem haben Sie heute schon etwas geschickt?",
    artikel:
      "Das Genus ist im Deutschen weitgehend grammatisch und nicht logisch, deshalb lohnt es sich, Nomen konsequent mit Artikel zu lernen. Es gibt allerdings verlässliche Endungen: -ung, -heit, -keit, -schaft und -ion sind feminin, -chen und -ment meist neutral. Bei zusammengesetzten Wörtern bestimmt immer das letzte Wort den Artikel, also die Haustür. Mit welchen Artikeln haben Sie die meisten Schwierigkeiten?",
    konjunktiv: LEVEL_KNOWLEDGE.B2.examples.explain.partner,
    generic:
      "Gute Frage. Am besten erkläre ich das an einem konkreten Beispiel aus Ihrem Berufsalltag. Nennen Sie mir doch einen Satz, bei dem Sie unsicher sind, dann gehen wir ihn gemeinsam durch. Welcher wäre das?",
  },
};

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
  if (intent === "explain") {
    const ex = EXPLANATIONS[level][topic ?? "generic"] ?? EXPLANATIONS[level].generic!;
    if (!said.has(ex)) return ex;
  }
  const k = LEVEL_KNOWLEDGE[level].examples;
  if (intent === "opinion" && !said.has(k.opinion.partner)) return k.opinion.partner;
  if (intent === "story" && !said.has(k.story.partner)) return k.story.partner;

  const keyword = TOPIC_REPLIES[level].find((r) => r.match.test(lastUser));
  const byKeyword = keyword ? fresh(keyword.replies, said, offset) : null;
  return byKeyword ?? fresh(CHAT_POOL[level], said, offset) ?? CHAT_POOL[level][offset % CHAT_POOL[level].length];
}

export class MockLLM implements LLM {
  provider = "mock" as const;

  async chat(p: ChatParams): Promise<string> {
    const level = p.level ?? levelFromSystem(p.system);
    let text: string;
    if (p.purpose === "summary") {
      text = "Earlier the learner talked about: " + p.messages.map((m) => m.content).join(" / ").slice(0, 400);
    } else if (p.purpose === "simplify") {
      const used = p.messages.map((m) => m.content).join(" ");
      text = LEVEL_CONFIG[level].safeFallbacks.find((f) => !used.includes(f)) ?? LEVEL_CONFIG[level].safeFallbacks[0];
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
