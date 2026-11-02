import type { GrammarLesson } from "../../src/lib/grammarTypes";
import { B, CH, K, lesson } from "./build";

const L = (
  no: number,
  id: string,
  ch: (typeof CH)[keyof typeof CH],
  de: string,
  ar: string,
  map: Parameters<typeof lesson>[6],
) => lesson("A2", no, id, ch, de, ar, map);

export const A2_MAP: GrammarLesson[] = [
  L(
    13,
    "a2-zwei-positionen",
    CH.saetze,
    "Zwei feste Positionen im Satz",
    "مكانين ثابتين في الجملة",
    {
      formula: ["Verb", "Pos. 2", "…", "Verb 2", "Ende"],
      ex: "Ich [gehe] heute Abend [schwimmen].",
      exAr: "فعلين في الجملة: واحد تاني كلمة والتاني في الآخر.",
      branches: [
        B("Satzklammer", "قوس الجملة", "violet", [
          K("Modalverb … [Infinitiv]", "", "Ich muss heute arbeiten."),
          K("haben/sein … [Partizip]", "", "Wir haben Fußball gespielt."),
          K("trennbar: steht … [auf]", "", "Er steht früh auf."),
        ]),
        B("gehen + Infinitiv", "يروح يعمل حاجة", "green", [
          K(
            "[gehen] … [einkaufen]",
            "",
            "Wir gehen morgen einkaufen.",
            "ich gehe … schwimmen / tanzen / essen",
          ),
        ]),
      ],
    },
  ),
  L(
    22,
    "a2-verben-akk-dat",
    CH.nomen,
    "Verben mit Akkusativ und Dativ",
    "أفعال بتاخد Dativ و Akkusativ",
    {
      formula: ["wem? (Dativ)", "+", "was? (Akk.)"],
      ex: "Ich kaufe [meinem Sohn] [einen Ball].",
      exAr: "الشخص Dativ، والحاجة Akkusativ.",
      branches: [
        B("Verben", "الأفعال", "violet", [
          K(
            "geben · schenken · zeigen",
            "يدي · يهادي · يوري",
            "Ich schenke dir eine Uhr.",
          ),
          K(
            "schicken · erklären · bringen",
            "يبعت · يشرح · يجيب",
            "Er erklärt uns die Regel.",
          ),
        ]),
        B("Reihenfolge", "الترتيب", "amber", [
          K(
            "Nomen: [Dativ] vor [Akk.]",
            "اسمين: الشخص الأول",
            "Ich gebe dem Kind den Ball.",
          ),
          K(
            "Pronomen: [Akk.] vor [Dativ]",
            "ضميرين: الحاجة الأول",
            "Ich gebe ihn ihm.",
            "Pronomen kurz → zuerst",
          ),
        ]),
      ],
    },
  ),
  L(
    23,
    "a2-verben-dativ",
    CH.nomen,
    "Verben mit Dativ",
    "أفعال بتاخد Dativ بس",
    {
      formula: ["Verb", "+", "wem?"],
      ex: "Ich helfe [dir], du dankst [mir].",
      exAr: "الأفعال دي مفعولها Dativ مع إن معناها مباشر.",
      branches: [
        B("Häufig", "الأشهر", "violet", [
          K(
            "helfen · danken · antworten",
            "يساعد · يشكر · يرد",
            "Kannst du mir helfen?",
          ),
          K(
            "gefallen · gehören · passen",
            "يعجب · يخص · يناسب",
            "Das Kleid gefällt mir.",
          ),
          K(
            "schmecken · gratulieren",
            "طعمه حلو · يهنّي",
            "Das Essen schmeckt mir gut.",
          ),
        ]),
        B("Ausdrücke", "تعبيرات", "green", [
          K("Wie geht es [dir]?", "إزيك؟", ""),
          K("[Mir] ist kalt.", "أنا بردان", "", "Person im Dativ"),
        ]),
      ],
    },
  ),
  L(
    24,
    "a2-wem-was",
    CH.nomen,
    "Frage nach Personen und Sachen",
    "السؤال عن الأشخاص والحاجات",
    {
      formula: ["wer · wen · wem", "·", "was"],
      ex: "[Wem] schenkst du [was]?",
      exAr: "أداة السؤال بتتغيّر حسب الحالة.",
      branches: [
        B("Personen", "أشخاص", "blue", [
          K("[Wer]? (Nom.)", "مين؟ (الفاعل)", "Wer kommt heute?"),
          K("[Wen]? (Akk.)", "مين؟ (المفعول)", "Wen besuchst du?"),
          K("[Wem]? (Dat.)", "لمين؟", "Wem hilfst du?"),
        ]),
        B("Sachen", "حاجات", "green", [
          K("[Was]? (Nom. + Akk.)", "إيه؟", "Was kaufst du?"),
        ]),
      ],
    },
  ),
  L(
    27,
    "a2-perfekt-sein",
    CH.verben2,
    "Perfekt mit sein",
    "الماضي التام مع sein",
    {
      formula: ["sein", "+", "Partizip II"],
      ex: "Ich [bin] nach Berlin [gefahren].",
      exAr: "أفعال الحركة وتغيير الحالة بتاخد sein.",
      branches: [
        B("Bewegung", "حركة من مكان لمكان", "green", [
          K("gehen → [ist] gegangen", "", "Er ist nach Hause gegangen."),
          K(
            "fahren · fliegen · kommen",
            "",
            "Wir sind nach Hurghada geflogen.",
          ),
        ]),
        B("Zustandswechsel", "تغيير حالة", "amber", [
          K("aufstehen · einschlafen", "", "Ich bin früh aufgestanden."),
          K("werden → [ist] geworden", "", "Sie ist Ärztin geworden."),
        ]),
        B("Ausnahmen", "استثناءات", "rose", [
          K(
            "sein · bleiben · passieren",
            "",
            "Ich bin zu Hause geblieben.",
            "Was ist passiert?",
          ),
        ]),
      ],
    },
  ),
  L(
    28,
    "a2-partizip-perfekt",
    CH.verben2,
    "Partizip Perfekt",
    "تكوين التصريف التالت",
    {
      formula: ["ge", "+", "Stamm", "+", "t / en"],
      ex: "machen → [ge]mach[t] · sehen → [ge]seh[en]",
      exAr: "المنتظم بـ ‎-t‎، وغير المنتظم بـ ‎-en‎ ومعاه تغيير أحيانًا.",
      branches: [
        B("Trennbar", "فعل بينفصل", "blue", [
          K("ein[ge]kauft", "ge بين البادئة والفعل", "Ich habe eingekauft."),
          K("auf[ge]standen", "", ""),
        ]),
        B("Ohne ge-", "من غير ge", "rose", [
          K(
            "be- · ver- · er- → [be]zahlt",
            "بادئة مش بتنفصل",
            "Hast du bezahlt?",
          ),
          K("-ieren → studier[t]", "", "Er hat Medizin studiert."),
        ]),
        B("Unregelmäßig", "غير منتظم", "amber", [
          K("trinken → [ge]trunk[en]", "", ""),
          K("gehen → [ge]gang[en]", "", "", "Partizip immer mit lernen"),
        ]),
      ],
    },
  ),
  L(
    29,
    "a2-praeteritum-modal",
    CH.verben2,
    "Präteritum: Modalverben",
    "الماضي من الأفعال المساعدة",
    {
      formula: ["Stamm (ohne Umlaut)", "+", "-te"],
      ex: "Ich [konnte] nicht kommen, ich [musste] arbeiten.",
      exAr: "مع الأفعال المساعدة بنستخدم الماضي البسيط.",
      branches: [
        B("Formen", "الأشكال", "violet", [
          K("können → [konnte]", "", ""),
          K("müssen → [musste] · dürfen → [durfte]", "النقطتين بيمشوا", ""),
          K(
            "wollen → [wollte] · sollen → [sollte]",
            "",
            "Ich wollte dich anrufen.",
            "möchten → wollte",
          ),
        ]),
        B("Endungen", "النهايات", "green", [
          K("ich/er [konnte] · du [konntest]", "ich = er", ""),
          K("wir/sie [konnten] · ihr [konntet]", "", ""),
        ]),
      ],
    },
  ),
  L(
    30,
    "a2-zeitengebrauch",
    CH.verben2,
    "Zeitengebrauch",
    "إمتى نستخدم كل زمن",
    {
      formula: ["Präsens", "·", "Perfekt", "·", "Präteritum"],
      ex: "Gestern [hatte] er Zeit und [hat] Sport [gemacht].",
      exAr: "في الكلام: Perfekt، إلا مع sein و haben والأفعال المساعدة.",
      branches: [
        B("Präsens", "المضارع", "green", [
          K(
            "jetzt + Zukunft",
            "دلوقتي وكمان المستقبل",
            "Morgen fahre ich nach Kairo.",
          ),
        ]),
        B("Perfekt", "الماضي في الكلام", "blue", [
          K("gesprochen", "أغلب الأفعال", "Ich habe ein Buch gelesen."),
        ]),
        B("Präteritum", "الماضي البسيط", "amber", [
          K("war · hatte · konnte", "sein و haben والمساعدة", "Ich war müde."),
          K("geschrieben", "في القصص والجرايد", "Es war einmal …"),
        ]),
      ],
    },
  ),
  L(
    31,
    "a2-reflexive-verben",
    CH.verben2,
    "Reflexive Verben",
    "الأفعال الانعكاسية",
    {
      formula: ["Verb", "+", "sich"],
      ex: "Sie wäscht [sich].",
      exAr: "الفاعل بيعمل الحاجة لنفسه.",
      branches: [
        B("Pronomen", "الضمائر", "violet", [
          K("ich [mich] · du [dich]", "", "Ich freue mich."),
          K(
            "er/sie/es [sich] · wir [uns] · ihr [euch]",
            "",
            "Wir treffen uns um 5.",
          ),
        ]),
        B("Immer reflexiv", "دايمًا مع sich", "green", [
          K("sich freuen · sich beeilen", "يفرح · يستعجل", "Beeil dich!"),
          K("sich erinnern · sich ausruhen", "يفتكر · يرتاح", ""),
        ]),
        B("Reziprok", "لبعض", "amber", [
          K(
            "[uns] / [sich] = einander",
            "بعض",
            "Sie lieben sich.",
            "= er liebt sie, sie liebt ihn",
          ),
        ]),
      ],
    },
  ),
  L(
    36,
    "a2-wechselpraep",
    CH.praep1,
    "Wechselpräpositionen: Dativ und Akkusativ",
    "حروف المكان: Dativ ولا Akkusativ؟",
    {
      formula: ["Wo?", "→", "Dativ", "·", "Wohin?", "→", "Akk."],
      ex: "Ich gehe [ins] Kino. Ich bin [im] Kino.",
      exAr: "حركة لمكان ← Akkusativ، مكان ثابت ← Dativ.",
      branches: [
        B("Wohin? → Akkusativ", "لفين؟ (حركة)", "rose", [
          K(
            "in [den] Park · in [die] Stadt",
            "",
            "Ich lege das Buch auf den Tisch.",
          ),
          K("in + das = [ins]", "", "Wir gehen ins Kino."),
        ]),
        B("Wo? → Dativ", "فين؟ (ثابت)", "blue", [
          K("im Park · in [der] Stadt", "", "Das Buch liegt auf dem Tisch."),
          K(
            "in + dem = [im]",
            "",
            "Wir sind im Kino.",
            "Bewegung = Akk., Position = Dat.",
          ),
        ]),
      ],
    },
  ),
  L(
    37,
    "a2-lokal-wohin",
    CH.praep1,
    "Lokale Präpositionen: Wohin?",
    "حروف الجر للاتجاه: رايح فين؟",
    {
      formula: ["Wohin?", "→", "zu · nach · in"],
      ex: "Ich gehe [zum] Arzt und [auf den] Markt.",
      exAr: "كل نوع مكان ليه حرف جر.",
      branches: [
        B("Personen & Orte", "أشخاص وأماكن", "green", [
          K("[zu] + Person", "لعند حد", "Ich gehe zu meiner Freundin."),
          K("[zum] / [zur] + Ort", "لمكان (دكتور، بنك)", "Ich gehe zur Bank."),
        ]),
        B("Länder & Städte", "دول ومدن", "blue", [
          K(
            "[nach] Berlin · [nach] Ägypten",
            "",
            "Wir fliegen nach Deutschland.",
          ),
          K(
            "[in die] Türkei · [in die] Schweiz",
            "دول ليها أداة",
            "",
            "nach Hause!",
          ),
        ]),
        B("Gebäude & Plätze", "مباني وأماكن عامة", "amber", [
          K("[ins] Kino · [in die] Schule", "جوه مبنى", ""),
          K(
            "[auf den] Markt · [an den] Strand",
            "مكان مفتوح · جنب الماية",
            "Wir fahren an den Strand.",
          ),
        ]),
      ],
    },
  ),
  L(
    38,
    "a2-lokal-wo",
    CH.praep1,
    "Lokale Präpositionen: Wo?",
    "حروف الجر للمكان: إنت فين؟",
    {
      formula: ["Wo?", "→", "bei · in · auf · an"],
      ex: "Ich war [beim] Arzt und bin jetzt [auf dem] Markt.",
      exAr: "نفس الأماكن، بس مكان ثابت ← Dativ.",
      branches: [
        B("Personen & Orte", "أشخاص وأماكن", "green", [
          K("[bei] + Person", "عند حد", "Ich bin bei meiner Oma."),
          K("[beim] Arzt · [bei der] Bank", "", ""),
        ]),
        B("Länder & Städte", "دول ومدن", "blue", [
          K("[in] Berlin · [in] Ägypten", "", "Ich wohne in Kairo."),
          K("[in der] Türkei", "", "", "zu Hause!"),
        ]),
        B("Gebäude & Plätze", "مباني وأماكن عامة", "amber", [
          K("[im] Kino · [in der] Schule", "", ""),
          K("[auf dem] Markt · [am] Strand", "", "Wir liegen am Strand."),
        ]),
      ],
    },
  ),
  L(
    39,
    "a2-lokal-woher",
    CH.praep1,
    "Lokale Präpositionen: Woher?",
    "حروف الجر للمصدر: جاي منين؟",
    {
      formula: ["Woher?", "→", "aus · von"],
      ex: "Ich komme [aus den] Bergen [vom] Skifahren.",
      exAr: "aus من جوه مكان، von من عند حد أو نشاط.",
      branches: [
        B("aus", "من جوه", "violet", [
          K("[aus] Ägypten · [aus dem] Kino", "", "Ich komme aus der Schule."),
        ]),
        B("von", "من عند", "green", [
          K("[von] + Person", "من عند حد", "Ich komme von meiner Tante."),
          K(
            "[vom] Arzt · [vom] Markt",
            "",
            "Sie kommt vom Training.",
            "zu → von, in → aus",
          ),
        ]),
      ],
    },
  ),
  L(
    40,
    "a2-adjektiv-nom-akk",
    CH.adj1,
    "Adjektivdeklination: Nominativ und Akkusativ",
    "نهاية الصفة: Nominativ و Akkusativ",
    {
      formula: ["Artikel", "+", "Adjektiv-e/-en", "+", "Nomen"],
      ex: "Ein nett[er] Mann! Ich liebe den nett[en] Mann.",
      exAr: "الصفة قبل الاسم بتاخد نهاية.",
      branches: [
        B("der/die/das", "بعد أداة معرفة", "blue", [
          K("der neu[e] Tisch · die neu[e] Uhr", "‎-e‎ في الـ Nominativ", ""),
          K(
            "Akk.: den neu[en] Tisch",
            "المذكر Akk. ‎-en",
            "Ich kaufe den neuen Tisch.",
          ),
          K("Plural: die neu[en] Tische", "الجمع ‎-en", ""),
        ]),
        B("ein/eine", "بعد أداة نكرة", "green", [
          K("ein neu[er] Tisch · ein neu[es] Auto", "النهاية بتوضح الجنس", ""),
          K(
            "Akk.: einen neu[en] Tisch",
            "",
            "Ich habe einen neuen Job.",
            "ein + -er/-es zeigt das Genus",
          ),
        ]),
      ],
    },
  ),
  L(
    41,
    "a2-adjektiv-dativ",
    CH.adj1,
    "Adjektivdeklination: Dativ",
    "نهاية الصفة في Dativ",
    {
      formula: ["Dativ", "→", "immer -en"],
      ex: "[Am] ersten Mai · mit dem neu[en] Auto",
      exAr: "في Dativ نهاية الصفة دايمًا ‎-en.",
      branches: [
        B("Dativ", "سهلة", "violet", [
          K("mit dem alt[en] Freund", "", "Ich wohne mit einem guten Freund."),
          K("in der groß[en] Stadt", "", ""),
          K("mit den neu[en] Schuhen", "", "", "Dativ = immer -en"),
        ]),
        B("Datum", "التاريخ", "amber", [
          K(
            "[am] erst[en] Mai",
            "يوم كام",
            "Am dritten Oktober habe ich Geburtstag.",
          ),
        ]),
      ],
    },
  ),
  L(
    42,
    "a2-komparativ",
    CH.adj1,
    "Komparativ und Vergleichssätze",
    "المقارنة",
    {
      formula: ["Adjektiv", "+", "-er", "+", "als"],
      ex: "Mein Bruder ist größ[er] [als] ich.",
      exAr: "أكتر من ← ‎-er + als، زي ← so … wie.",
      branches: [
        B("Komparativ", "أكتر من", "green", [
          K("schnell → schnell[er]", "", "Der Zug ist schneller als der Bus."),
          K("alt → [ä]lter · groß → gr[ö]ßer", "صفات قصيرة بتاخد umlaut", ""),
        ]),
        B("Unregelmäßig", "شواذ", "rose", [
          K("gut → [besser] · viel → [mehr]", "", "Heute geht es mir besser."),
          K("gern → [lieber]", "", "Ich trinke lieber Tee."),
        ]),
        B("so … wie", "زي بعض", "blue", [
          K(
            "[so] groß [wie]",
            "نفس الطول",
            "Er ist so alt wie ich.",
            "gleich: so … wie / anders: -er als",
          ),
        ]),
      ],
    },
  ),
  L(
    45,
    "a2-deshalb-trotzdem",
    CH.satz1,
    "Hauptsätze verbinden (Position 1)",
    "ربط جملتين: deshalb, dann …",
    {
      formula: ["deshalb/dann", "Pos. 1", "+", "Verb", "+", "Subjekt"],
      ex: "Es regnet, [deshalb] [bleibe] ich zu Hause.",
      exAr: "الأداة دي بتاخد المكان الأول والفعل بعدها على طول.",
      branches: [
        B("Folge", "النتيجة", "green", [
          K(
            "[deshalb]",
            "عشان كده",
            "Ich bin krank, deshalb gehe ich zum Arzt.",
          ),
        ]),
        B("Gegensatz / Alternative", "عكس / بديل", "rose", [
          K(
            "[trotzdem]",
            "رغم كده",
            "Es ist kalt, trotzdem gehe ich schwimmen.",
          ),
          K("[sonst]", "وإلا", "Beeil dich, sonst kommst du zu spät."),
        ]),
        B("Reihenfolge", "الترتيب", "blue", [
          K(
            "[dann] · [danach]",
            "بعدين · بعد كده",
            "Zuerst esse ich, dann lerne ich.",
            "Verb direkt danach!",
          ),
        ]),
      ],
    },
  ),
  L(
    46,
    "a2-weil-wenn-dass",
    CH.satz1,
    "Nebensätze mit weil, wenn und dass",
    "الجملة التابعة: weil, wenn, dass",
    {
      formula: ["…,", "weil/dass …", "+", "Verb", "Ende"],
      ex: "Ich lerne, weil ich Deutsch lernen [möchte].",
      exAr: "في الجملة التابعة الفعل بيروح آخر الجملة.",
      branches: [
        B("weil", "لأن", "green", [
          K("…, [weil] … Verb.", "", "Ich bleibe zu Hause, weil ich müde bin."),
        ]),
        B("wenn", "لو / لما", "blue", [
          K(
            "…, [wenn] … Verb.",
            "",
            "Wenn ich Zeit habe, rufe ich dich an.",
            "Nebensatz vorne → Verb, Verb",
          ),
        ]),
        B("dass", "إن", "violet", [
          K("…, [dass] … Verb.", "", "Ich glaube, dass er recht hat."),
          K(
            "Trennbar: …, dass er früh [aufsteht].",
            "الفعل بيرجع حتة واحدة",
            "",
          ),
        ]),
      ],
    },
  ),
  L(50, "a2-partikeln", CH.woerter, "Partikeln", "كلمات صغيرة بتغيّر الإحساس", {
    formula: ["denn", "·", "mal", "·", "doch", "·", "ja"],
    ex: "Was heißt das [denn]?",
    exAr: "كلمات صغيرة بتخلّي الكلام طبيعي وأخف.",
    branches: [
      B("Fragen", "في الأسئلة", "blue", [
        K("[denn]", "يعني / بقى (اهتمام)", "Wo bist du denn?"),
      ]),
      B("Bitten", "في الطلبات", "green", [
        K("[mal]", "خفيفة كده", "Komm mal her!"),
        K("[doch]", "ما تعمل …", "Setz dich doch!"),
      ]),
      B("Aussagen", "في الكلام العادي", "amber", [
        K("[ja]", "زي ما إنت عارف", "Das ist ja toll!"),
        K("[eben]", "هو كده", "Das ist eben so."),
      ]),
    ],
  }),
  L(
    51,
    "a2-wortbildung",
    CH.woerter,
    "Aus Wörtern neue Wörter machen",
    "تكوين كلمات جديدة",
    {
      formula: ["Wort", "+", "-chen · -er · -in · -ung"],
      ex: "das Haus → das Häus[chen]",
      exAr: "نهايات بتعمل كلمة جديدة من كلمة قديمة.",
      branches: [
        B("Personen", "أشخاص", "green", [
          K("lehren → der Lehr[er]", "", ""),
          K(
            "der Lehrer → die Lehrer[in]",
            "المؤنث ‎-in",
            "Meine Ärztin ist nett.",
          ),
        ]),
        B("Sachen", "حاجات", "blue", [
          K("wohnen → die Wohn[ung]", "‎-ung‎ دايمًا die", ""),
          K(
            "das Buch → das Büch[lein] · das Brot → das Bröt[chen]",
            "التصغير دايمًا das",
            "Ich kaufe Brötchen.",
            "-ung = die, -chen = das",
          ),
        ]),
      ],
    },
  ),
];
