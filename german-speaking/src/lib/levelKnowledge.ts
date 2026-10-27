// Background knowledge for the conversation partners: what to talk about, what grammar each
// partner can explain (and how simply), typical mistakes of Arabic speakers, and few-shot
// replies (one explanation, one opinion, one short story per level). Used in the system prompts.

import type { Level } from "./levels";

export interface GrammarRef {
  topic: string;
  how: string;
}

export interface Exchange {
  learner: string;
  partner: string;
}

export interface LevelKnowledge {
  talkAbout: string[];
  canExplain: GrammarRef[];
  aboveLevel: string;
  explainStyle: string;
  examples: { chat: Exchange; explain: Exchange; opinion: Exchange; story: Exchange };
}

// Typical difficulties of Arabic-speaking learners of German. The partner uses this for gentle
// recasts and to explain the right thing when asked.
export const ARABIC_SPEAKER_MISTAKES: string[] = [
  "Verb position (V2): 'Heute ich gehe ins Büro' instead of 'Heute gehe ich ins Büro'.",
  "Verb at the end in subordinate clauses: 'weil ich bin müde' instead of 'weil ich müde bin'.",
  "Modal verbs: second verb not at the end: 'Ich kann sprechen Deutsch' → 'Ich kann Deutsch sprechen'.",
  "Separable verbs not separated: 'Ich anrufe dich' → 'Ich rufe dich an'.",
  "Perfekt with haben for movement verbs: 'Ich habe nach Berlin gegangen' → 'Ich bin … gegangen'.",
  "Dropping 'sein' (Arabic nominal sentences have no 'to be'): 'Ich müde' → 'Ich bin müde'.",
  "Age with haben (calque of 'عندي'): 'Ich habe 25 Jahre' → 'Ich bin 25 Jahre alt'.",
  "Articles and gender: Arabic has no neuter; articles are dropped or guessed (der/die/das).",
  "Dativ after mit/bei/von/zu/aus/nach: 'mit die Bahn' → 'mit der Bahn'.",
  "Adjective endings and plural forms.",
  "du vs. Sie with customers and colleagues.",
  "Pronunciation: p vs b, f vs v/w, ch [ç]/[x] vs sch [ʃ], ü/ö, long vs short vowels, inserting vowels into consonant clusters ('Sipräche').",
];

export const LEVEL_KNOWLEDGE: Record<Level, LevelKnowledge> = {
  A1: {
    talkAbout: [
      "names, countries, languages, family, age",
      "home, city, weather, days and times",
      "food, drinks, cafés, shopping, prices",
      "jobs, hobbies, sports, music, films (simple likes and dislikes)",
      "daily routine, weekend plans, Egypt and Germany (simple facts)",
    ],
    canExplain: [
      { topic: "der/die/das, ein/eine", how: "Every noun has an article. Learn the noun with its article: der Tisch, die Tür, das Buch." },
      { topic: "verb endings in the present (ich -e, du -st, er/sie -t)", how: "Show one verb with ich, du, er: ich wohne, du wohnst, er wohnt." },
      { topic: "W-Fragen and Ja/Nein-Fragen", how: "W-word first, verb second. Ja/Nein-question: the verb comes first." },
      { topic: "nicht vs. kein", how: "kein before a noun with ein/eine, nicht for the rest." },
      { topic: "Modalverben (können, müssen, möchten, wollen)", how: "The modal verb is in position 2, the second verb is at the very end." },
      { topic: "trennbare Verben (aufstehen, einkaufen, anrufen)", how: "The small first part goes to the end of the sentence." },
      { topic: "Akkusativ (einen, den)", how: "Only der changes: der Kaffee → Ich trinke einen Kaffee." },
      { topic: "numbers, time, days", how: "Short examples with Uhr and am." },
    ],
    aboveLevel:
      "If the learner asks about grammar above A1 (Perfekt, Dativ, Nebensätze …), give a tiny preview in A1 words with two very simple example sentences, say that this is a topic for later (A2), and go back to the conversation.",
    explainStyle:
      "Explain with very short sentences (max 10 words each), then give 2-3 example sentences. You may add ONE very short Arabic hint in round brackets inside a sentence, e.g. (الفعل التاني بيروح آخر الجملة). Then ask the learner to make their own sentence.",
    examples: {
      chat: {
        learner: "Ich wohne in Kairo. Es ist sehr heiß.",
        partner: "Oh, Kairo! Hier in Hamburg regnet es oft. Wie viele Grad sind es heute bei dir?",
      },
      explain: {
        learner: "Können Sie Modalverben erklären?",
        partner:
          "Gern! Modalverben sind zum Beispiel können, müssen und möchten. Das Modalverb steht auf Platz zwei. Das zweite Verb steht ganz am Ende (الفعل التاني بيروح آخر الجملة). Ich kann gut kochen. Du musst heute arbeiten. Jetzt du: Was kannst du gut?",
      },
      opinion: {
        learner: "Wie finden Sie Hamburg?",
        partner:
          "Ich finde Hamburg super! Die Stadt ist groß und grün. Es gibt viel Wasser und viele Schiffe. Aber es regnet sehr oft. Das finde ich nicht so gut. Und du? Magst du Regen?",
      },
      story: {
        learner: "Was machen Sie am Sonntag?",
        partner:
          "Am Sonntag gehe ich auf den Markt. Dort kaufe ich Obst und Brot. Ich trinke einen Kaffee mit meiner Freundin. Wir reden und lachen viel. Am Abend lese ich ein Buch. Und du? Was machst du am Sonntag?",
      },
    },
  },

  A2: {
    talkAbout: [
      "last weekend, holidays, travel stories, transport",
      "work and colleagues, customers, appointments, phone calls",
      "shopping, clothes, the doctor, health, the flat",
      "free time, football, cooking, films and series, social media",
      "living in Germany vs. Egypt: food, weather, people (simple comparisons)",
    ],
    canExplain: [
      { topic: "Perfekt (haben/sein + Partizip)", how: "haben or sein in position 2, Partizip at the end; movement/change of place → sein." },
      { topic: "Präteritum of sein, haben, Modalverben", how: "war, hatte, konnte, musste — used instead of Perfekt for these verbs." },
      { topic: "Modalverben incl. dürfen/sollen", how: "Position 2 + infinitive at the end; meaning of each in one sentence." },
      { topic: "trennbare Verben (also in Perfekt: angerufen, eingekauft)", how: "Prefix at the end; in Perfekt the ge goes in the middle." },
      { topic: "Dativ and Akkusativ basics, Wechselpräpositionen", how: "Wo? → Dativ (im Büro), Wohin? → Akkusativ (ins Büro); mit/bei/von/zu + Dativ." },
      { topic: "weil, dass, wenn, ob", how: "The verb jumps to the end of the part after weil/dass/wenn." },
      { topic: "comparison (größer als, am liebsten)", how: "-er + als, am -sten." },
      { topic: "du vs. Sie", how: "Sie for customers, bosses and strangers; du for friends and many colleagues." },
    ],
    aboveLevel:
      "If the learner asks about grammar above A2 (Relativsätze, Passiv, Konjunktiv II …), give a short preview in A2 words with two simple examples, say it is a B1 topic, and continue the chat.",
    explainStyle:
      "Explain in simple sentences (max 14 words), give 2-3 examples from daily life or work. You may add ONE short Arabic hint in round brackets inside a sentence if the rule is hard. Then invite the learner to try a sentence and gently correct it.",
    examples: {
      chat: {
        learner: "Am Wochenende ich habe Fußball gespielt.",
        partner: "Cool, du hast am Wochenende Fußball gespielt! Ich spiele auch gern, aber nur mit Freunden im Park. Hast du gewonnen?",
      },
      explain: {
        learner: "Was ist das Perfekt?",
        partner:
          "Gute Frage! Mit dem Perfekt sprechen wir über die Vergangenheit. Du brauchst haben oder sein auf Platz zwei und das Partizip am Ende. Ich habe Pizza gegessen. Wir haben Fußball gespielt. Bei Bewegung nimmt man sein (حركة أو تغيير مكان = sein): Ich bin nach Köln gefahren. Jetzt du: Was hast du gestern gemacht?",
      },
      opinion: {
        learner: "Findest du Homeoffice gut?",
        partner:
          "Hmm, für mich ist das schwierig. Homeoffice ist praktisch, weil man keine Zeit im Bus verliert. Aber ich vermisse dann meine Kollegen. Und im Fahrradladen kann ich ja nicht von zu Hause arbeiten. Was findest du besser: Büro oder zu Hause?",
      },
      story: {
        learner: "Erzähl mal von deinem Urlaub!",
        partner:
          "Letzten Sommer war ich mit zwei Freunden in Portugal. Wir sind mit dem Zug und dann mit dem Bus gefahren. Am ersten Tag habe ich meinen Rucksack im Bus vergessen! Zum Glück hat der Fahrer ihn gefunden. Danach hatten wir eine super Woche am Meer. Bist du schon mal ans Meer gefahren?",
      },
    },
  },

  B1: {
    talkAbout: [
      "work life: projects, meetings, deadlines, difficult customers, teamwork",
      "experiences and stories, plans and wishes, studying and careers",
      "opinions on everyday topics: home office, social media, cities, sport, health",
      "culture: films, series, books, music, festivals, food in Germany and Egypt",
      "job applications, interviews, life as a foreigner in Germany",
    ],
    canExplain: [
      { topic: "Dativ vs. Akkusativ, Dativ prepositions", how: "Akkusativ = direct object, Dativ = the person who receives; mit/bei/von/zu/aus + Dativ." },
      { topic: "Nebensätze: obwohl, damit, während, nachdem, als vs. wenn", how: "Verb at the end; meaning of each connector with one work example." },
      { topic: "Relativsätze", how: "der/die/das after a comma, verb at the end: der Kunde, der angerufen hat." },
      { topic: "Passiv Präsens and Präteritum", how: "werden + Partizip; the action is important, not the person." },
      { topic: "Konjunktiv II for wishes, advice, politeness", how: "würde + infinitive, hätte, wäre, könnte: Ich würde …, Könnten Sie …?" },
      { topic: "Perfekt vs. Präteritum", how: "Speaking: mostly Perfekt; writing and sein/haben/modals: Präteritum." },
      { topic: "zu + Infinitiv, um … zu", how: "Ich habe keine Lust, … zu …; um … zu = purpose." },
      { topic: "Modalverben and trennbare Verben in all tenses", how: "With examples from the office." },
    ],
    aboveLevel:
      "If the learner asks about C1-level style (Partizipialkonstruktionen, heavy Nominalstil), explain the idea briefly in B1 language with one example and say that it mostly appears in formal writing.",
    explainStyle:
      "Explain clearly in B1 German (max 20 words per sentence) with 2-3 realistic examples, ideally from work. Then ask the learner to build their own example and correct it kindly.",
    examples: {
      chat: {
        learner: "Heute hatte ich ein Meeting mit einem schwierigen Kunden.",
        partner: "Oh nein, das kenne ich! Bei uns gibt es auch so einen Kunden, der immer alles sofort braucht. Was wollte er denn von euch?",
      },
      explain: {
        learner: "Kannst du mir den Unterschied zwischen Dativ und Akkusativ erklären?",
        partner:
          "Klar, das fragen viele! Der Akkusativ ist oft die Sache, die direkt etwas erlebt oder bekommt. Der Dativ ist meistens die Person, die etwas bekommt. Ich gebe dem Kunden den Vertrag: dem Kunden ist Dativ, den Vertrag ist Akkusativ. Nach mit, bei, von, zu und aus kommt immer Dativ, zum Beispiel: Ich fahre mit dem Bus. Nach für und ohne kommt Akkusativ: Das ist für den Chef. Probier mal: Wem schickst du heute eine E-Mail?",
      },
      opinion: {
        learner: "Was hältst du von Homeoffice?",
        partner:
          "Ehrlich gesagt habe ich da gemischte Gefühle. Einerseits spare ich jeden Tag eine Stunde Fahrzeit, und zu Hause kann ich mich besser konzentrieren. Andererseits fehlt mir der Kontakt zu den Kollegen, vor allem in der Kaffeeküche. Ideal wären für mich zwei Tage Homeoffice pro Woche. Wie ist das bei dir?",
      },
      story: {
        learner: "Ist dir bei der Arbeit mal etwas Lustiges passiert?",
        partner:
          "Ja, letzte Woche! Ich hatte ein Online-Meeting mit einem wichtigen Kunden. Nach zehn Minuten ist meine Katze über die Tastatur gelaufen und hat das Meeting beendet. Ich musste den Kunden anrufen und mich entschuldigen. Zum Glück hat er gelacht, weil er selbst zwei Katzen hat. Hast du so etwas auch schon mal erlebt?",
      },
    },
  },

  B2: {
    talkAbout: [
      "business: negotiations, presentations, conflicts, leadership, careers",
      "society and politics (balanced, respectful): migration, education, work culture",
      "technology and AI, media, environment and energy, cities and mobility",
      "culture and history, Germany vs. Egypt, values and communication styles",
      "debates: take positions, weigh pros and cons, give examples",
    ],
    canExplain: [
      { topic: "Konjunktiv I and indirect speech", how: "Mainly in news and formal reports; in everyday speech people use dass + Indikativ or Konjunktiv II." },
      { topic: "Passiv in all forms (with Modalverben, Zustandspassiv, Ersatzformen)", how: "Muss erledigt werden / ist erledigt / lässt sich lösen." },
      { topic: "Nominalisierung vs. verbal style", how: "Show one sentence both ways and when each fits." },
      { topic: "two-part connectors (zwar … aber, je … desto, sowohl … als auch, weder … noch)", how: "One business example each." },
      { topic: "Konjunktiv II Vergangenheit", how: "hätte/wäre + Partizip for regret and hypotheses about the past." },
      { topic: "Partizipialattribute (simple)", how: "der unterschriebene Vertrag = der Vertrag, der unterschrieben wurde." },
      { topic: "register: formal vs. informal, polite disagreement", how: "Phrases for objecting politely in meetings." },
    ],
    aboveLevel:
      "If the learner asks about very literary or academic structures, explain briefly and say that they are rare in spoken German.",
    explainStyle:
      "Explain precisely but naturally (max 28 words per sentence), with 2-3 professional examples, then ask the learner to apply it in a sentence of their own and give feedback.",
    examples: {
      chat: {
        learner: "Ich glaube, dass künstliche Intelligenz viele Jobs ersetzen wird.",
        partner: "Das ist eine verbreitete Sorge. Aber hat nicht jede technische Revolution am Ende auch neue Berufe geschaffen? Welche Jobs wären Ihrer Meinung nach besonders betroffen?",
      },
      explain: {
        learner: "Können Sie mir erklären, wann man Konjunktiv I benutzt?",
        partner:
          "Gern. Den Konjunktiv I verwendet man vor allem in der indirekten Rede, also wenn man wiedergibt, was jemand gesagt hat, ohne sich selbst festzulegen. Typisch ist das in Nachrichten und formellen Berichten. Der Chef sagt: Ich bin zufrieden. In indirekter Rede heißt das: Der Chef sagt, er sei zufrieden. Im Alltag sagen die meisten allerdings einfach: Er sagt, dass er zufrieden ist. Versuchen Sie es mal: Was hat Ihr letzter Kunde gesagt, in indirekter Rede?",
      },
      opinion: {
        learner: "Was halten Sie von der Vier-Tage-Woche?",
        partner:
          "Ich sehe das differenziert. Studien zeigen zwar, dass die Produktivität oft gleich bleibt und die Mitarbeiter zufriedener sind. Allerdings funktioniert das Modell kaum in Bereichen, in denen Kunden ständig erreichbar sein müssen, etwa im Service. Für ein Beratungsunternehmen wie unseres wäre es nur mit klaren Vertretungsregeln denkbar. Würden Sie persönlich lieber vier lange oder fünf kürzere Tage arbeiten?",
      },
      story: {
        learner: "Was war Ihre schwierigste Verhandlung?",
        partner:
          "Vor einigen Jahren sollte ich für einen Mittelständler einen Vertrag mit einem großen Zulieferer neu verhandeln. Die Gegenseite hatte uns ein Ultimatum gestellt, und mein Kunde stand massiv unter Druck. Statt über den Preis zu streiten, haben wir eine längere Laufzeit gegen bessere Konditionen angeboten. Am Ende waren beide Seiten zufrieden. Wie gehen Sie mit Druck in Verhandlungen um?",
      },
    },
  },
};
