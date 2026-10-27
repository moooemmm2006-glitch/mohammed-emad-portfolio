// Pre-written explanations for demo mode (no API key), 13 grammar topics × 4 levels.
// Each one: what it is, the rule, examples, a typical mistake, then an invitation to try.
// A1/A2 may contain one short Arabic sentence (shown on screen, not read aloud).

import type { GrammarTopic } from "../intent";
import { LEVEL_KNOWLEDGE } from "../levelKnowledge";
import type { Level } from "../levels";

export type ExplainKey = GrammarTopic | "generic";

export const EXPLANATIONS: Record<Level, Record<ExplainKey, string>> = {
  A1: {
    modalverben:
      "Gern! Modalverben sind Verben wie können, müssen und möchten. Das Modalverb steht auf Platz zwei. Das zweite Verb steht ganz am Ende. Ich kann gut kochen. Du musst heute arbeiten. Wir möchten Kaffee trinken. Falsch ist: Ich kann sprechen Deutsch. Richtig ist: Ich kann Deutsch sprechen. يعني الفعل التاني بيروح آخر الجملة. Jetzt du: Was kannst du gut?",
    trennbar:
      "Trennbare Verben haben zwei Teile, zum Beispiel aufstehen. Der kleine Teil geht ans Ende. Ich stehe um sieben Uhr auf. Ich kaufe heute ein. Ich rufe meine Mutter an. Falsch ist: Ich aufstehe um sieben. Richtig ist: Ich stehe um sieben auf. الجزء الصغير بيروح آخر الجملة. Jetzt du: Wann stehst du auf?",
    perfekt:
      "Das Perfekt ist für gestern und letzte Woche. Man braucht haben oder sein. Das zweite Verb kommt ans Ende. Ich habe Pizza gegessen. Wir haben Fußball gespielt. Ich bin nach Hause gegangen. Bei gehen und fahren nimmt man sein. ده زمن الماضي اللي بنستخدمه في الكلام. Das lernen wir genau bei A2. Was hast du heute gegessen?",
    praeteritum:
      "Das Präteritum ist auch für die Vergangenheit. Bei A1 brauchst du nur war und hatte. Ich war gestern zu Hause. Ich hatte keine Zeit. Wir waren in Kairo. Falsch ist: Ich bin gestern müde. Richtig ist: Ich war gestern müde. Wo warst du gestern?",
    dativ:
      "Der Dativ kommt nach mit, bei und von. Der wird dem, die wird der, das wird dem. Ich fahre mit dem Bus. Ich wohne bei der Familie. Ich spiele mit dem Kind. Falsch ist: mit die Bahn. Richtig ist: mit der Bahn. الأداة بتتغير بعد حروف جر معينة. Den Dativ lernen wir genau bei A2. Womit fährst du zur Arbeit?",
    akkusativ:
      "Der Akkusativ ist das Ding nach vielen Verben. Nur der ändert sich: der wird den. Ein wird einen. Ich trinke einen Kaffee. Ich sehe den Bus. Ich habe einen Bruder. Die und das bleiben gleich. Falsch ist: Ich habe ein Bruder. Richtig ist: Ich habe einen Bruder. Was trinkst du gern?",
    artikel:
      "Jedes Nomen hat einen Artikel: der, die oder das. Lern das Nomen immer mit Artikel. Der Tisch, die Tür, das Buch. Wörter auf -ung sind immer die: die Zeitung. Es gibt leider keine einfache Regel. مفيش قاعدة سهلة، احفظ الكلمة مع الأداة بتاعتها. Welches Wort möchtest du lernen?",
    wortstellung:
      "Im deutschen Satz steht das Verb auf Platz zwei. Ich gehe heute ins Kino. Heute gehe ich ins Kino. Am Montag arbeite ich. Falsch ist: Heute ich gehe ins Kino. Bei Ja-Nein-Fragen steht das Verb vorne. Kommst du mit? الفعل دايماً في المكان التاني في الجملة. Jetzt du: Was machst du morgen?",
    nebensatz:
      "Mit weil sagst du einen Grund. Nach weil geht das Verb ans Ende. Ich lerne Deutsch, weil ich in Deutschland arbeiten will. Ich bin müde, weil ich viel arbeite. Falsch ist: weil ich bin müde. Richtig ist: weil ich müde bin. بعد كلمة السبب الفعل بيروح آخر الجملة. Dass lernen wir bei A2. Warum lernst du Deutsch?",
    adjektiv:
      "Adjektive beschreiben ein Nomen, zum Beispiel groß oder schön. Nach sein bleibt das Adjektiv gleich. Das Haus ist groß. Der Kaffee ist heiß. Vor dem Nomen bekommt es eine Endung. Das ist ein großes Haus. Die Endungen lernen wir später genau. Wie ist deine Wohnung?",
    konjunktiv:
      "Der Konjunktiv ist für Wünsche und höfliche Fragen. Bei A1 lernst du nur: Ich möchte. Ich möchte einen Kaffee. Ich möchte nach Berlin fahren. Möchtest du Tee? Formen wie würde und hätte kommen später. Was möchtest du heute machen?",
    fragewoerter:
      "Fragewörter beginnen mit W: wer, was, wo, wann, wie, woher. Das Fragewort steht vorne, das Verb auf Platz zwei. Wie heißt du? Woher kommst du? Wo wohnst du? Wann arbeitest du? Falsch ist: Wo du wohnst? Richtig ist: Wo wohnst du? Jetzt du: Frag mich etwas!",
    passiv:
      "Das Passiv lernst du erst bei B1. Dort ist die Aktion wichtig, nicht die Person. Das Essen wird gekocht. Das Haus wird gebaut. ده المبني للمجهول، هتتعلمه بعدين. Jetzt bleiben wir beim Aktiv: Wer kocht bei dir?",
    generic:
      "Gute Frage! Ich erkläre es gern einfach. Sag mir bitte ein Beispiel. Dann sprechen wir zusammen darüber. Welches Wort ist schwer für dich?",
  },
  A2: {
    modalverben:
      "Gern! Modalverben sind können, müssen, wollen, dürfen, sollen und möchten. Sie sagen, ob man etwas kann, muss oder darf. Das Modalverb steht auf Platz zwei, das zweite Verb ganz am Ende. Ich muss heute lange arbeiten. Darf ich hier parken? Wir wollen am Samstag ins Kino gehen. Ein typischer Fehler ist: Ich kann sprechen Deutsch. Richtig ist: Ich kann Deutsch sprechen. Jetzt du: Was musst du diese Woche machen?",
    trennbar:
      "Trennbare Verben wie anrufen, einkaufen oder aufstehen haben ein Präfix. Im Präsens steht das Präfix am Ende: Ich rufe den Kunden an. Im Perfekt kommt ge in die Mitte: Ich habe den Kunden angerufen. Mit Modalverb bleibt das Verb zusammen am Ende: Ich muss morgen früh aufstehen. Ein typischer Fehler ist: Ich einkaufe am Samstag. Richtig ist: Ich kaufe am Samstag ein. Jetzt du: Wann bist du heute aufgestanden?",
    perfekt: LEVEL_KNOWLEDGE.A2.examples.explain.partner,
    praeteritum:
      "Das Präteritum ist eine Vergangenheit, vor allem für Bücher und Zeitungen. Beim Sprechen benutzen wir es fast nur bei sein, haben und Modalverben. Ich war gestern beim Arzt. Wir hatten keine Zeit. Ich musste lange warten. Er konnte nicht kommen. Falsch ist: Ich habe gestern müde gewesen. Besser ist: Ich war gestern müde. Wo warst du am Wochenende?",
    dativ:
      "Den Dativ brauchst du nach mit, bei, von, zu, aus und nach. Auch bei der Frage wo kommt er oft. Der und das werden zu dem, die wird zu der. Ich fahre mit dem Bus. Ich arbeite bei einer Firma. Ich gehe zum Arzt, also zu dem Arzt. Ein typischer Fehler ist: mit die Bahn. Richtig ist: mit der Bahn. Jetzt du: Mit wem sprichst du heute?",
    akkusativ:
      "Der Akkusativ ist oft das Ding, das man direkt sieht oder kauft. Nur der ändert sich: der wird den, ein wird einen. Nach für, ohne und durch kommt immer Akkusativ. Bei der Frage wohin kommt auch oft Akkusativ: Ich gehe ins Büro. Ich kaufe einen Laptop. Das ist für den Chef. Ein typischer Fehler ist: Ich habe ein Termin. Richtig ist: Ich habe einen Termin. Was kaufst du diese Woche?",
    artikel:
      "Der, die oder das musst du leider mit jedem Nomen lernen. Es gibt aber ein paar Tipps. Wörter auf -ung, -heit und -keit sind immer die: die Zeitung, die Freiheit. Wörter auf -chen sind immer das: das Mädchen. Im Dativ wird der zu dem und die zu der. Welches Wort ist für dich schwer?",
    wortstellung:
      "Im Hauptsatz steht das Verb immer auf Platz zwei. Das muss nicht das erste Wort sein. Heute gehe ich ins Büro. Am Montag habe ich einen Termin. Mit Modalverb oder Perfekt steht der zweite Teil am Ende. Ich habe heute viel gearbeitet. Viele sagen falsch: Heute ich gehe ins Büro. Richtig ist: Heute gehe ich ins Büro. Jetzt du: Was machst du morgen nach der Arbeit?",
    nebensatz:
      "Mit weil sagst du einen Grund, mit dass erzählst du etwas. Nach weil, dass und wenn steht das Verb am Ende. Ich lerne Deutsch, weil ich in Deutschland arbeiten möchte. Ich glaube, dass der Kurs gut ist. Wenn ich Zeit habe, koche ich gern. Ein typischer Fehler ist: weil ich bin müde. Richtig ist: weil ich müde bin. Jetzt du: Warum lernst du Deutsch?",
    adjektiv:
      "Adjektive vor einem Nomen bekommen eine Endung. Nach der, die, das ist die Endung meistens -e: der große Tisch. Nach ein bekommt das Adjektiv die Endung vom Artikel: ein großer Tisch. Im Plural ohne Artikel heißt es oft: neue Kollegen. Nach sein gibt es keine Endung: Der Tisch ist groß. Ein typischer Fehler ist: ein neue Auto. Richtig ist: ein neues Auto. Wie ist deine neue Wohnung?",
    konjunktiv:
      "Den Konjunktiv II brauchst du bei A2 vor allem für höfliche Bitten. Man sagt dann könnten, würden oder hätten. Könnten Sie mir bitte helfen? Ich hätte gern einen Kaffee. Würden Sie das bitte wiederholen? Für Wünsche wie Wenn ich reich wäre lernst du das genau bei B1. Jetzt du: Wie bestellst du höflich im Café?",
    fragewoerter:
      "Fragewörter sind wer, was, wo, wohin, woher, wann, wie, warum und welche. Das Fragewort steht vorne, dann kommt das Verb. Wohin fährst du im Urlaub? Warum lernst du Deutsch? Wie lange arbeitest du schon hier? Ohne Fragewort steht das Verb vorne: Hast du Zeit? Ein typischer Fehler ist: Warum du lernst Deutsch? Jetzt du: Stell mir eine Frage mit warum!",
    passiv:
      "Das Passiv ist eigentlich ein Thema für B1. Man benutzt es, wenn die Aktion wichtiger ist als die Person. Man bildet es mit werden und dem Partizip. Das Paket wird morgen geliefert. Hier wird Deutsch gesprochen. Im Alltag sagt man oft einfach man: Man spricht hier Deutsch. Jetzt du: Was macht man in deiner Firma?",
    generic: "Gute Frage! Ich erkläre es dir gern. Sag mir bitte einen Beispielsatz. Dann zeige ich dir die Regel daran. Welcher Satz ist für dich schwierig?",
  },
  B1: {
    modalverben:
      "Klar! Modalverben wie können, müssen, dürfen, sollen, wollen und möchten zeigen, ob etwas möglich, nötig oder erlaubt ist. Das Modalverb steht auf Position zwei, das andere Verb im Infinitiv am Ende. Im Nebensatz steht das Modalverb ganz am Ende: Ich weiß, dass ich morgen früher kommen muss. Für die Vergangenheit benutzt man meistens das Präteritum: Ich musste gestern lange arbeiten. Ein typischer Fehler ist: Ich kann sprechen Deutsch. Richtig ist: Ich kann Deutsch sprechen. Probier mal: Was durftest du als Kind nicht machen?",
    trennbar:
      "Trennbare Verben bestehen aus einem Präfix und einem Verb, zum Beispiel anrufen oder vorbereiten. Im Hauptsatz steht das Präfix am Ende: Ich bereite die Präsentation vor. Im Nebensatz bleibt das Verb zusammen: Ich weiß, dass er morgen anruft. Im Perfekt steht ge in der Mitte: Ich habe den Kunden angerufen. Bei zu steht zu auch in der Mitte: Ich habe vergessen, ihn anzurufen. Ein typischer Fehler ist: Ich anrufe dich später. Was bereitest du gerade vor?",
    perfekt:
      "Das Perfekt benutzt man vor allem, wenn man über die Vergangenheit spricht. Man bildet es mit haben oder sein auf Position zwei und dem Partizip am Ende. Sein nimmt man bei Bewegung und Veränderung, zum Beispiel gehen, fahren, aufstehen oder einschlafen. Ich habe gestern einen Bericht geschrieben, dann bin ich nach Hause gefahren. Beim Schreiben benutzt man öfter das Präteritum. Ein typischer Fehler ist: Ich habe nach Berlin gefahren. Richtig ist: Ich bin nach Berlin gefahren. Erzähl mal: Was hast du am Wochenende erlebt?",
    praeteritum:
      "Das Präteritum ist die Vergangenheitsform für geschriebene Texte, zum Beispiel in Büchern, Berichten und Zeitungen. Beim Sprechen benutzt man es vor allem bei sein, haben und den Modalverben. Regelmäßige Verben bekommen -te: ich arbeitete, wir machten. Unregelmäßige Verben ändern den Vokal: ich ging, ich kam, ich schrieb. Gestern war ich lange im Büro, weil ich einen Bericht schreiben musste. Ein typischer Fehler ist, im Gespräch nur Präteritum zu benutzen. Natürlicher ist: Ich bin gestern einkaufen gegangen. Was war gestern dein wichtigster Termin?",
    dativ: LEVEL_KNOWLEDGE.B1.examples.explain.partner,
    akkusativ:
      "Der Akkusativ markiert meistens das direkte Objekt, also wen oder was man sieht, kauft oder braucht. Nur der Artikel der ändert sich: der wird zu den, ein wird zu einen. Nach für, ohne, durch, gegen und um steht immer Akkusativ. Bei Wechselpräpositionen nimmt man Akkusativ, wenn es eine Richtung gibt: Ich lege das Handy auf den Tisch. Ein typischer Fehler ist: Ich habe ein Termin beim Arzt. Richtig ist: Ich habe einen Termin beim Arzt. Was brauchst du gerade für deine Arbeit?",
    artikel:
      "Leider muss man die Artikel meistens zusammen mit dem Nomen lernen. Es gibt aber hilfreiche Regeln: Wörter auf -ung, -heit, -keit und -ion sind feminin, also die. Wörter auf -chen und -lein sind immer neutral, also das. Männliche Personen und Wochentage sind meistens der. Ein guter Trick ist, neue Wörter immer mit Artikel und Farbe aufzuschreiben. Welches Wort möchtest du gerade lernen?",
    wortstellung:
      "Im Hauptsatz steht das konjugierte Verb immer auf Position zwei, auch wenn der Satz mit einer Zeitangabe beginnt. Das Subjekt steht dann direkt nach dem Verb: Morgen habe ich ein wichtiges Meeting. Alle anderen Verbteile wie Infinitiv oder Partizip stehen am Ende. Im Nebensatz mit weil, dass oder obwohl steht das konjugierte Verb ganz am Ende. Eine gute Reihenfolge im Mittelteil ist oft: wann, warum, wie, wo. Ein typischer Fehler ist: Morgen ich habe ein Meeting. Was machst du am Wochenende? Beginne deinen Satz mit Am Wochenende!",
    nebensatz:
      "Nebensätze geben zusätzliche Informationen, zum Beispiel einen Grund, eine Bedingung oder einen Gegensatz. Das konjugierte Verb steht im Nebensatz immer am Ende. Ich bleibe heute länger, weil das Projekt morgen fertig sein muss. Obwohl ich müde bin, gehe ich noch zum Sport. Ich spare Geld, damit ich im Sommer nach Ägypten fliegen kann. Wenn der Nebensatz vorne steht, beginnt der Hauptsatz direkt mit dem Verb. Ein typischer Fehler ist: weil ich habe keine Zeit. Richtig ist: weil ich keine Zeit habe. Probier mal: Was machst du, obwohl du keine Lust hast?",
    adjektiv:
      "Adjektivendungen hängen vom Artikel, vom Genus und vom Kasus ab. Nach dem bestimmten Artikel ist die Endung meistens -e oder -en: der neue Kollege, mit dem neuen Kollegen. Nach ein zeigt das Adjektiv das Genus: ein neuer Laptop, ein neues Büro. Ohne Artikel übernimmt das Adjektiv die Artikelendung: mit großem Interesse. Nach sein gibt es keine Endung: Das Büro ist neu. Ein typischer Fehler ist: ein neue Projekt. Richtig ist: ein neues Projekt. Wie sieht dein Büro aus? Beschreib es mit zwei Adjektiven!",
    konjunktiv:
      "Den Konjunktiv II benutzt man für Wünsche, Ratschläge, irreale Situationen und höfliche Bitten. Meistens bildet man ihn mit würde und Infinitiv: Ich würde gern im Ausland arbeiten. Bei sein, haben und Modalverben benutzt man eigene Formen: wäre, hätte, könnte, müsste. Wenn ich mehr Zeit hätte, würde ich jeden Tag Deutsch sprechen. An deiner Stelle würde ich den Chef direkt fragen. Ein typischer Fehler ist: Wenn ich Zeit habe, würde ich kommen. Richtig ist: Wenn ich Zeit hätte, würde ich kommen. Was würdest du machen, wenn du eine Million Euro hättest?",
    fragewoerter:
      "Fragewörter wie wer, was, wann, wo, warum und wie lange stehen am Anfang, danach kommt sofort das Verb. Mit Präposition fragt man bei Sachen oft mit wo-: Worüber sprecht ihr? Womit fährst du zur Arbeit? Bei Personen sagt man zum Beispiel mit wem: Mit wem arbeitest du zusammen? In indirekten Fragen steht das Verb am Ende: Weißt du, wann das Meeting beginnt? Ein typischer Fehler ist: Weißt du, wann beginnt das Meeting? Stell mir mal eine indirekte Frage!",
    passiv:
      "Das Passiv benutzt man, wenn die Handlung wichtiger ist als die Person, die sie macht. Man bildet es mit werden und dem Partizip II. Die Ware wird morgen geliefert. Das Büro wird jeden Abend geputzt. In der Vergangenheit sagt man: Das Projekt wurde letzte Woche abgeschlossen. Wenn man die Person nennen will, benutzt man von: Der Vertrag wird vom Chef unterschrieben. Ein typischer Fehler ist, sein statt werden zu benutzen: Die Ware ist morgen geliefert. Was wird in deiner Firma jeden Tag gemacht?",
    generic:
      "Gute Frage! Gib mir am besten ein Beispiel aus deinem Alltag, dann erkläre ich es dir daran. So kann man sich die Regel viel leichter merken. Welcher Satz macht dir Probleme?",
  },
  B2: {
    modalverben:
      "Gern. Modalverben drücken Möglichkeit, Notwendigkeit, Erlaubnis oder Absicht aus, also können, müssen, dürfen, sollen, wollen und mögen. Interessant wird es im Perfekt: Dort steht der Infinitiv statt des Partizips, etwa: Ich habe gestern nicht kommen können. Im Nebensatz steht das Hilfsverb dann sogar vor den beiden Infinitiven: weil ich nicht habe kommen können. Außerdem haben einige Modalverben eine subjektive Bedeutung, zum Beispiel: Er soll sehr kompetent sein, also man sagt es. Ein typischer Fehler ist: Ich habe nicht kommen gekonnt. Können Sie einen Satz mit einer solchen Bedeutung bilden?",
    trennbar:
      "Bei trennbaren Verben rückt das Präfix im Hauptsatz ans Satzende, etwa: Wir schließen das Projekt nächste Woche ab. Im Nebensatz bleibt das Verb zusammen, und beim Infinitiv mit zu steht zu in der Mitte: Es ist wichtig, die Frist einzuhalten. Achtung: Manche Präfixe wie über, unter oder um können trennbar oder untrennbar sein und ändern dann die Bedeutung. Ein typischer Fehler ist: Wir müssen die Frist zu einhalten. Können Sie einen Satz mit einhalten oder abschließen bilden?",
    perfekt:
      "Das Perfekt ist im gesprochenen Deutsch die Standardform für die Vergangenheit, während das Präteritum eher in schriftlichen Texten vorkommt. Ausnahmen sind sein, haben und die Modalverben, die man auch mündlich meist im Präteritum verwendet. Mit sein bilden das Perfekt vor allem Verben der Bewegung und der Zustandsveränderung, etwa: Der Umsatz ist deutlich gestiegen. Ein typischer Fehler ist: Der Umsatz hat gestiegen. Wie würden Sie Ihren letzten Arbeitstag im Perfekt zusammenfassen?",
    praeteritum:
      "Das Präteritum ist die typische Erzählform der Schriftsprache, etwa in Berichten, Protokollen und Romanen. Mündlich verwendet man es vor allem bei sein, haben, den Modalverben und einigen häufigen Verben wie geben oder wissen. In einem formellen Bericht würde man also schreiben: Der Kunde lehnte das Angebot ab, da die Lieferzeit zu lang war. Im Gespräch klingt dagegen das Perfekt natürlicher: Der Kunde hat das Angebot abgelehnt. Ein häufiger Fehler ist es, beide Formen in einem kurzen Bericht ohne Grund zu mischen. Wie würden Sie Ihren letzten Projektabschluss in zwei Sätzen im Präteritum zusammenfassen?",
    dativ:
      "Grob gesagt markiert der Akkusativ das direkte Objekt, während der Dativ meist den Empfänger einer Handlung bezeichnet. Bei Verben wie geben, schicken oder erklären haben Sie oft beides: Ich erkläre dem Kunden die neuen Konditionen. Wechselpräpositionen folgen der Logik Ort oder Richtung: Das Dokument liegt auf dem Tisch, aber ich lege es auf den Tisch. Einige Verben verlangen nur den Dativ, etwa helfen, danken oder gratulieren. Ein typischer Fehler ist: Ich helfe den Kollegen bei jedem Problem, wenn nur einer gemeint ist. Wem haben Sie heute schon etwas geschickt?",
    akkusativ:
      "Der Akkusativ markiert das direkte Objekt, also das, worauf sich die Handlung unmittelbar richtet. Er steht außerdem nach Präpositionen wie für, durch, ohne, gegen und um sowie bei Wechselpräpositionen mit Richtung. Einige Verben verlangen sogar zwei Akkusative, etwa lehren oder kosten: Das kostet mich viel Zeit. Auch bei Zeitangaben ohne Präposition steht Akkusativ: Wir treffen uns jeden Montag. Ein typischer Fehler ist: Wir suchen ein neuen Mitarbeiter statt einen neuen Mitarbeiter. Welche Akkusativ-Konstruktion fällt Ihnen im Berufsalltag besonders schwer?",
    artikel:
      "Das Genus ist im Deutschen weitgehend grammatisch und nicht logisch, deshalb lohnt es sich, Nomen konsequent mit Artikel zu lernen. Es gibt allerdings verlässliche Endungen: -ung, -heit, -keit, -schaft und -ion sind feminin, -chen und -ment meist neutral. Bei zusammengesetzten Wörtern bestimmt immer das letzte Wort den Artikel, also die Haustür. Ein typischer Fehler ist: das Information statt die Information. Mit welchen Artikeln haben Sie die meisten Schwierigkeiten?",
    wortstellung:
      "Das Grundprinzip ist die Verbklammer: Das konjugierte Verb steht im Hauptsatz an Position zwei, alle anderen Verbteile am Satzende. Im Mittelfeld gilt als Faustregel temporal, kausal, modal, lokal, also wann, warum, wie und wo. Pronomen stehen dabei meist vor Nomen: Ich habe es ihm gestern geschickt. Was im Satz neu oder wichtig ist, rückt eher nach hinten, bekannte Informationen eher nach vorne. Ein typischer Fehler ist ein zweites Element vor dem Verb: Gestern ich habe den Bericht geschickt. Können Sie einen Satz mit vier Angaben im Mittelfeld bilden?",
    nebensatz:
      "Nebensätze hängen vom Hauptsatz ab und haben das konjugierte Verb am Ende. Neben weil und dass sind auf B2-Niveau vor allem Konnektoren wie obwohl, sodass, indem, falls und je nachdem, ob wichtig. Indem Sie früh informieren, vermeiden Sie Konflikte. Je nachdem, ob der Kunde zustimmt, verschieben wir den Termin. Bei Relativsätzen mit Präposition steht die Präposition vorne: das Projekt, an dem ich arbeite. Ein typischer Fehler ist die Verbstellung bei zwei Verben: weil ich das nicht habe machen können, nicht: weil ich das nicht machen können habe. Können Sie einen Satz mit indem über Ihre Arbeit bilden?",
    adjektiv:
      "Adjektivendungen folgen drei Mustern: schwach nach dem bestimmten Artikel, gemischt nach ein, kein und Possessivartikeln, stark ohne Artikel. Bei der schwachen Deklination enden fast alle Formen auf -e oder -en: die neuen Richtlinien. Bei der starken Deklination übernimmt das Adjektiv die Signalendung des Artikels: mit freundlichem Gruß. Partizipien als Adjektive folgen denselben Regeln: der unterschriebene Vertrag. Ein häufiger Fehler ist die fehlende Endung im Dativ Plural: mit den neue Kollegen statt mit den neuen Kollegen. Wie würden Sie Ihr Unternehmen mit drei Adjektiven in einem Satz beschreiben?",
    konjunktiv: LEVEL_KNOWLEDGE.B2.examples.explain.partner,
    fragewoerter:
      "Neben den klassischen W-Fragen sind im Beruf vor allem Präpositionaladverbien und indirekte Fragen wichtig. Bei Sachen fragt man mit wo- plus Präposition: Worauf kommt es an? Wofür ist das Budget gedacht? Indirekte Fragen wirken höflicher, das Verb steht dann am Ende: Könnten Sie mir sagen, bis wann die Zahlen vorliegen? Ein typischer Fehler ist die Hauptsatzstellung in indirekten Fragen: Ich frage mich, warum ist das so teuer. Wie würden Sie einen Kunden höflich nach seinem Budget fragen?",
    passiv:
      "Das Vorgangspassiv bildet man mit werden und Partizip II, das Zustandspassiv mit sein und Partizip II. Der Vertrag wird gerade geprüft, beschreibt also den Prozess, der Vertrag ist geprüft dagegen das Ergebnis. Mit Modalverben steht der Infinitiv Passiv am Ende: Die Frist muss eingehalten werden. Im Perfekt heißt es worden, nicht geworden: Das Angebot ist gestern angenommen worden. Als Alternativen gibt es man, sich lassen und -bar: Das Problem lässt sich lösen, es ist lösbar. Welche Passivform verwenden Sie in Ihren E-Mails am häufigsten?",
    generic:
      "Gute Frage. Am besten erkläre ich das an einem konkreten Beispiel aus Ihrem Berufsalltag. Nennen Sie mir doch einen Satz, bei dem Sie unsicher sind, dann gehen wir ihn gemeinsam durch. Welcher wäre das?",
  },
};
