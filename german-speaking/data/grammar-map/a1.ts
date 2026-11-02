import type { GrammarLesson } from "../../src/lib/grammarTypes";
import { B, CH, K, lesson } from "./build";

const L = (
  no: number,
  id: string,
  ch: (typeof CH)[keyof typeof CH],
  de: string,
  ar: string,
  map: Parameters<typeof lesson>[6],
) => lesson("A1", no, id, ch, de, ar, map);

export const A1_MAP: GrammarLesson[] = [
  L(
    1,
    "a1-personalpronomen",
    CH.verben1,
    "Personalpronomen",
    "الضمائر الشخصية",
    {
      formula: ["wer?", "→", "Pronomen"],
      ex: "[Ich] heiße Sara. [Sie] kommt aus Kairo.",
      exAr: "الضمير بيقول مين اللي بيعمل الفعل.",
      branches: [
        B("Singular", "المفرد", "green", [
          K("[ich]", "أنا", "Ich lerne Deutsch."),
          K("[du]", "إنت / إنتي (للصحاب)", "Du bist nett."),
          K(
            "[er] · [sie] · [es]",
            "هو · هي · هو لغير العاقل",
            "Der Tisch? Er ist neu.",
            "Pronomen = Artikel: der → er",
          ),
        ]),
        B("Plural", "الجمع", "blue", [
          K("[wir]", "إحنا", "Wir wohnen in Gizeh."),
          K("[ihr]", "إنتو (للصحاب)", "Ihr seid laut."),
          K("[sie]", "هم", "Sie spielen Fußball."),
        ]),
        B("Höflich", "بأدب (حضرتك)", "violet", [
          K(
            "[Sie]",
            "حضرتك / حضراتكم — دايمًا بحرف كبير",
            "Woher kommen Sie?",
            "Sie groß = höflich",
            "Sie ≠ sie",
          ),
        ]),
      ],
      phrases: ["Wie heißt du?", "Wie heißen Sie?"],
    },
  ),
  L(2, "a1-praesens", CH.verben1, "Konjugation Präsens", "تصريف المضارع", {
    formula: ["Stamm", "+", "Endung"],
    ex: "lern|en → ich lern[e], du lern[st]",
    exAr: "شيل -en من المصدر وحط نهاية الضمير.",
    branches: [
      B("Endungen", "النهايات", "green", [
        K(
          "ich lern[e] · du lern[st]",
          "مع أنا ‎-e‎، مع إنت ‎-st",
          "Ich lerne jeden Tag.",
        ),
        K("er/sie/es lern[t]", "مع هو/هي ‎-t", "Sie lernt schnell."),
        K(
          "wir · sie · Sie lern[en]",
          "الجمع والأدب ‎-en زي المصدر",
          "Wir lernen zusammen.",
        ),
        K("ihr lern[t]", "مع إنتو ‎-t", "Ihr lernt viel."),
      ]),
      B("Stamm auf -t / -d", "جذر بينتهي بـ ‎t‎ أو ‎d", "amber", [
        K(
          "du arbeit[est]",
          "بنزود ‎-e-‎ عشان النطق",
          "Du arbeitest viel.",
          "arbeiten, finden, warten",
        ),
        K("er find[et]", "نفس الفكرة مع هو", "Er findet den Schlüssel."),
      ]),
      B("Stamm auf -s / -z", "جذر بينتهي بـ ‎s‎ أو ‎z", "blue", [
        K(
          "du heiß[t]",
          "مع إنت ‎-t‎ بس (من غير s زيادة)",
          "Wie heißt du?",
          "tanzen → du tanzt",
        ),
      ]),
    ],
    phrases: ["Ich komme aus Ägypten.", "Was machst du?"],
  }),
  L(
    3,
    "a1-sein-haben",
    CH.verben1,
    "sein, haben und besondere Verben",
    "sein و haben وأفعال خاصة",
    {
      formula: ["sein", "·", "haben", "·", "wissen"],
      ex: "Ich [bin] müde, aber ich [habe] Zeit.",
      exAr: "الأفعال دي ليها تصريف لوحدها، احفظها زي ما هي.",
      branches: [
        B("sein", "يكون", "violet", [
          K("ich [bin] · du [bist]", "أنا أكون · إنت تكون", "Ich bin Student."),
          K("er [ist] · wir [sind]", "هو · إحنا", "Wir sind zu Hause."),
          K("ihr [seid] · sie [sind]", "إنتو · هم", "Seid ihr fertig?"),
        ]),
        B("haben", "يملك / عنده", "green", [
          K("ich [habe] · du [hast]", "عندي · عندك", "Hast du ein Handy?"),
          K(
            "er [hat]",
            "عنده",
            "Er hat zwei Brüder.",
            "kein b: du hast, er hat",
          ),
        ]),
        B("Besondere Verben", "أفعال تانية خاصة", "amber", [
          K(
            "wissen: ich [weiß], er [weiß]",
            "يعرف (معلومة)",
            "Ich weiß es nicht.",
          ),
          K("werden: du [wirst], er [wird]", "يصبح", "Er wird Arzt."),
        ]),
      ],
    },
  ),
  L(
    4,
    "a1-vokalwechsel",
    CH.verben1,
    "Verben mit Vokalwechsel",
    "أفعال بيتغيّر فيها حرف العلة",
    {
      formula: ["du", "+", "er/sie/es", "→", "a→ä · e→i/ie"],
      ex: "ich fahre → du [fä]hrst → er [fä]hrt",
      exAr: "التغيير بيحصل مع إنت وهو/هي بس.",
      branches: [
        B("a → ä", "a بتبقى ä", "green", [
          K(
            "fahren → du f[ä]hrst",
            "يسافر / يسوق",
            "Er fährt nach Alexandria.",
          ),
          K("schlafen → er schl[ä]ft", "ينام", "Das Baby schläft."),
        ]),
        B("e → i", "e بتبقى i", "blue", [
          K("sprechen → du spr[i]chst", "يتكلم", "Sprichst du Deutsch?"),
          K(
            "essen → er [i]sst",
            "ياكل",
            "Sie isst gern Fisch.",
            "geben, helfen, nehmen",
          ),
        ]),
        B("e → ie", "e بتبقى ie", "rose", [
          K("lesen → du l[ie]st", "يقرأ", "Er liest ein Buch."),
          K("sehen → er s[ie]ht", "يشوف", "Siehst du das?"),
        ]),
      ],
      phrases: ["Was isst du gern?", "Er spricht gut Deutsch."],
    },
  ),
  L(
    5,
    "a1-modalverben-position",
    CH.verben1,
    "Modalverben: Konjugation und Position",
    "الأفعال المساعدة: تصريفها ومكانها",
    {
      formula: ["Modalverb", "Pos. 2", "…", "Infinitiv", "Ende"],
      ex: "Ich [kann] heute nicht [kommen].",
      exAr: "الفعل المساعد في المكان التاني، والفعل الأساسي في آخر الجملة.",
      branches: [
        B("Konjugation", "التصريف", "violet", [
          K(
            "ich/er [kann] · du [kannst]",
            "مع أنا وهو نفس الشكل",
            "Er kann gut schwimmen.",
            "ich = er (kein -t!)",
          ),
          K("wollen: ich [will] · wir [wollen]", "عايز", "Wir wollen essen."),
        ]),
        B("Satzklammer", "قوس الجملة", "green", [
          K(
            "Pos. 2 … Ende",
            "المساعد تاني كلمة · المصدر في الآخر",
            "Du [musst] die Hausaufgaben [machen].",
          ),
          K(
            "Frage: [Kannst] du … [helfen]?",
            "في السؤال المساعد في الأول",
            "Kannst du mir helfen?",
          ),
        ]),
        B("Die sechs", "الستة", "amber", [
          K("können · müssen · dürfen", "يقدر · لازم · مسموح", ""),
          K("wollen · sollen · möchten", "عايز · المفروض · حابب", ""),
        ]),
      ],
    },
  ),
  L(
    6,
    "a1-modalverben-1",
    CH.verben1,
    "Modalverben: Gebrauch 1",
    "استخدام الأفعال المساعدة 1",
    {
      formula: ["können", "·", "wollen", "·", "möchten"],
      ex: "Ich [möchte] einen Kaffee, bitte.",
      exAr: "القدرة، والرغبة، والطلب المؤدب.",
      branches: [
        B("können", "يقدر / يعرف", "green", [
          K("Fähigkeit", "قدرة: بعرف أعمل حاجة", "Ich kann Gitarre spielen."),
          K("Möglichkeit", "إمكانية: ينفع", "Hier kann man parken."),
        ]),
        B("wollen", "عايز (إرادة قوية)", "rose", [
          K(
            "Plan / Wunsch",
            "خطة أو رغبة واضحة",
            "Ich will Arzt werden.",
            "wollen = stark",
          ),
        ]),
        B("möchten", "حابب (بأدب)", "blue", [
          K(
            "höflicher Wunsch",
            "طلب مؤدب",
            "Möchten Sie etwas trinken?",
            "im Café: ich möchte …",
          ),
        ]),
      ],
    },
  ),
  L(
    7,
    "a1-modalverben-2",
    CH.verben1,
    "Modalverben: Gebrauch 2",
    "استخدام الأفعال المساعدة 2",
    {
      formula: ["müssen", "·", "sollen", "·", "dürfen"],
      ex: "Hier [darf] man nicht rauchen.",
      exAr: "الإلزام، والنصيحة، والإذن.",
      branches: [
        B("müssen", "لازم", "rose", [
          K(
            "Pflicht",
            "حاجة مفيش منها هروب",
            "Ich muss morgen früh aufstehen.",
          ),
          K(
            "nicht müssen",
            "مش لازم (اختياري)",
            "Du musst nicht kommen.",
            "nicht müssen = nicht nötig",
          ),
        ]),
        B("sollen", "المفروض (حد قال)", "amber", [
          K(
            "Rat / Auftrag",
            "نصيحة أو طلب من حد",
            "Der Arzt sagt, ich soll viel trinken.",
          ),
        ]),
        B("dürfen", "مسموح", "green", [
          K("Erlaubnis", "إذن", "Darf ich das Fenster öffnen?"),
          K(
            "nicht dürfen",
            "ممنوع",
            "Hier darf man nicht parken.",
            "nicht dürfen = verboten",
          ),
        ]),
      ],
    },
  ),
  L(
    8,
    "a1-trennbare-verben",
    CH.verben1,
    "Trennbare Verben",
    "الأفعال اللي بتنفصل",
    {
      formula: ["Präfix", "+", "Verb"],
      ex: "Ich stehe um 7 Uhr [auf].",
      exAr: "البادئة بتنفصل وتروح آخر الجملة.",
      branches: [
        B("Aufstehen & Schlafen", "الصحيان والنوم", "green", [
          K(
            "[auf]stehen",
            "يقوم من السرير",
            "Ich stehe um 7 Uhr auf.",
            "wenn du anfängst, dich zu bewegen",
          ),
          K("[auf]wachen", "يصحى", "Ich wache früh auf."),
          K("[ein]schlafen", "ينام", "Ich schlafe schnell ein."),
        ]),
        B("Kleidung", "اللبس", "blue", [
          K("[an]ziehen", "يلبس", "Ich ziehe meine Jacke an."),
          K("[aus]ziehen", "يقلع", "Ich ziehe die Schuhe aus."),
          K(
            "[um]ziehen",
            "يغيّر هدومه / يعزّل",
            "Wir ziehen nach München um.",
            undefined,
            "2 Bedeutungen",
          ),
        ]),
        B("Mit Modalverb", "مع فعل مساعد", "violet", [
          K(
            "… [auf]stehen",
            "مع فعل مساعد البادئة بترجع مع الفعل في الآخر",
            "Ich muss früh aufstehen.",
            "nicht trennen!",
          ),
        ]),
      ],
      phrases: ["Ich rufe dich morgen an.", "Der Zug fährt um 8 Uhr ab."],
    },
  ),
  L(9, "a1-imperativ", CH.verben1, "Imperativ", "صيغة الأمر", {
    formula: ["Verb", "Pos. 1", "!"],
    ex: "[Komm] bitte!  [Kommt] bitte!  [Kommen] Sie bitte!",
    exAr: "الأمر بيبدأ بالفعل، ومعاه bitte عشان يبقى مؤدب.",
    branches: [
      B("du", "لواحد (صاحبك)", "green", [
        K("du komm|st → [Komm]!", "شيل du وشيل ‎-st", "Komm bitte her!"),
        K("du sprichst → [Sprich]!", "تغيير e→i بيفضل", "Sprich langsam!"),
      ]),
      B("ihr", "لأكتر من واحد", "blue", [
        K("ihr kommt → [Kommt]!", "زي المضارع من غير ihr", "Kommt schnell!"),
      ]),
      B("Sie", "بأدب", "violet", [
        K("[Kommen] Sie!", "الفعل + Sie", "Nehmen Sie Platz, bitte."),
        K(
          "sein: [Sei] / [Seid] / [Seien] Sie",
          "الأمر من sein خاص",
          "Sei ruhig!",
        ),
      ]),
    ],
  }),
  L(
    10,
    "a1-w-fragen",
    CH.saetze,
    "Fragen mit Fragewort",
    "الأسئلة بأداة استفهام",
    {
      formula: ["W-Wort", "+", "Verb", "+", "…?"],
      ex: "[Wo] wohnst du?",
      exAr: "أداة السؤال في الأول والفعل بعدها على طول.",
      branches: [
        B("Personen & Sachen", "أشخاص وحاجات", "green", [
          K("[Wer]?", "مين؟", "Wer ist das?"),
          K("[Was]?", "إيه؟", "Was machst du?"),
        ]),
        B("Ort & Zeit", "المكان والوقت", "blue", [
          K(
            "[Wo]? · [Woher]? · [Wohin]?",
            "فين؟ · منين؟ · لفين؟",
            "Woher kommst du?",
          ),
          K(
            "[Wann]? · [Wie lange]?",
            "إمتى؟ · قد إيه؟",
            "Wann beginnt der Kurs?",
          ),
        ]),
        B("Art & Grund", "الطريقة والسبب", "amber", [
          K("[Wie]? · [Wie viel]?", "إزاي؟ · كام؟", "Wie viel kostet das?"),
          K("[Warum]?", "ليه؟", "Warum lernst du Deutsch?"),
        ]),
      ],
    },
  ),
  L(
    11,
    "a1-ja-nein-fragen",
    CH.saetze,
    "Ja-/Nein-Fragen und Antworten",
    "أسئلة إجابتها أيوه أو لأ",
    {
      formula: ["Verb", "Pos. 1", "+", "Subjekt", "?"],
      ex: "[Lernst] du Deutsch? — Ja.",
      exAr: "السؤال بيبدأ بالفعل.",
      branches: [
        B("Ja / Nein", "أيوه / لأ", "green", [
          K("[Ja], …", "أيوه", "Hast du Zeit? — Ja, ich habe Zeit."),
          K("[Nein], …", "لأ", "Bist du müde? — Nein, gar nicht."),
        ]),
        B("Doch!", "بلى (رد على سؤال نفي)", "rose", [
          K(
            "[Doch]!",
            "لما السؤال فيه نفي وإنت عايز تقول أيوه",
            "Kommst du nicht? — Doch, ich komme!",
            "Frage mit nicht/kein → doch",
          ),
        ]),
      ],
      phrases: ["Sprechen Sie Englisch?", "Hast du kein Auto? — Doch."],
    },
  ),
  L(
    12,
    "a1-position-2",
    CH.saetze,
    "Position 2 im Satz",
    "الفعل في المكان التاني",
    {
      formula: ["Pos. 1", "+", "Verb", "+", "Rest"],
      ex: "[Am Abend] essen wir Pizza.",
      exAr: "أي حاجة تيجي في الأول، الفعل لازم يفضل تاني.",
      branches: [
        B("Normal", "الترتيب العادي", "green", [
          K(
            "Subjekt · [Verb] · …",
            "الفاعل ثم الفعل",
            "Wir essen am Abend Pizza.",
          ),
        ]),
        B("Umstellung", "لما نقدّم حاجة", "blue", [
          K(
            "Zeit · [Verb] · Subjekt",
            "الوقت في الأول ← الفاعل بعد الفعل",
            "Heute gehe ich ins Kino.",
            "Verb bleibt auf Platz 2",
          ),
          K(
            "Ort · [Verb] · Subjekt",
            "المكان في الأول",
            "In Kairo wohnt meine Tante.",
          ),
        ]),
      ],
    },
  ),
  L(14, "a1-plural", CH.nomen, "Nomen: Plural", "جمع الأسماء", {
    formula: ["die", "+", "Plural"],
    ex: "der Tisch → [die] Tisch[e]",
    exAr: "في الجمع الأداة دايمًا die، والنهايات بتتحفظ مع الكلمة.",
    branches: [
      B("-e / -¨e", "‎-e‎ وأحيانًا umlaut", "green", [
        K("der Tag → die Tag[e]", "", "Drei Tage frei!"),
        K("der Stuhl → die St[ü]hl[e]", "", ""),
      ]),
      B("-(e)n", "أغلب المؤنث", "rose", [
        K("die Frau → die Frau[en]", "", ""),
        K("die Lampe → die Lampe[n]", "", ""),
      ]),
      B("-er / -s / –", "نهايات تانية", "blue", [
        K("das Kind → die Kind[er]", "", ""),
        K("das Auto → die Auto[s]", "كلمات أجنبية غالبًا ‎-s", ""),
        K(
          "der Lehrer → die Lehrer",
          "من غير تغيير",
          "",
          "immer mit Plural lernen!",
        ),
      ]),
    ],
  }),
  L(
    15,
    "a1-artikel",
    CH.nomen,
    "Artikel: definit, indefinit, kein",
    "أدوات التعريف والتنكير والنفي",
    {
      formula: ["der/die/das", "·", "ein/eine", "·", "kein"],
      ex: "Das ist [ein] Hund. [Der] Hund heißt Max.",
      exAr: "أول مرة نقول ein، وبعد ما نعرفه نقول der.",
      branches: [
        B("Definit", "معرفة", "violet", [
          K(
            "[der] Mann · [die] Frau · [das] Kind",
            "مذكر · مؤنث · محايد",
            "Die Tasche ist neu.",
          ),
          K("Plural: [die]", "الجمع", "Die Kinder spielen."),
        ]),
        B("Indefinit", "نكرة", "green", [
          K(
            "[ein] Mann · [eine] Frau · [ein] Kind",
            "واحد / واحدة",
            "Ich habe eine Idee.",
          ),
          K("Plural: –", "مفيش أداة في الجمع", "Ich kaufe Äpfel."),
        ]),
        B("Negativ", "نفي", "rose", [
          K(
            "[kein] · [keine]",
            "مفيش / ولا",
            "Ich habe keine Zeit.",
            "kein = nicht + ein",
          ),
        ]),
      ],
    },
  ),
  L(16, "a1-negation", CH.nomen, "Negation", "النفي", {
    formula: ["nicht", "·", "kein"],
    ex: "Ich koche [nicht]. Ich habe [keine] Zeit.",
    exAr: "kein مع الاسم النكرة، nicht مع الباقي.",
    branches: [
      B("kein", "مع اسم", "rose", [
        K("ein → [kein]", "بدل ein", "Das ist kein Problem."),
        K(
          "ohne Artikel → [kein]",
          "اسم من غير أداة",
          "Ich trinke keinen Kaffee.",
        ),
      ]),
      B("nicht", "مع الفعل والباقي", "blue", [
        K("Verb + [nicht]", "في الآخر غالبًا", "Ich komme heute nicht."),
        K("[nicht] + Adjektiv", "قبل الصفة", "Das ist nicht teuer."),
        K("der … [nicht]", "مع الاسم المعرّف", "Ich kenne den Mann nicht."),
      ]),
    ],
  }),
  L(17, "a1-akkusativ", CH.nomen, "Akkusativ", "حالة المفعول به", {
    formula: ["wen? / was?", "→", "den / einen"],
    ex: "Ich sehe [den] Mann.",
    exAr: "المذكر بس اللي بيتغيّر: der ← den.",
    branches: [
      B("Maskulin", "المذكر بيتغيّر", "rose", [
        K("der → [den]", "", "Ich kaufe den Tisch."),
        K("ein → [einen] · kein → [keinen]", "", "Ich habe einen Bruder."),
      ]),
      B("Gleich", "الباقي زي ما هو", "green", [
        K("die · das · die", "مؤنث · محايد · جمع", "Ich lese die Zeitung."),
        K("eine · ein", "", "Sie hat ein Auto."),
      ]),
      B("Verben", "أفعال بتاخد Akkusativ", "blue", [
        K(
          "haben · sehen · kaufen · brauchen",
          "",
          "Ich brauche einen Stift.",
          "es gibt + Akkusativ",
        ),
      ]),
    ],
  }),
  L(18, "a1-dativ", CH.nomen, "Dativ", "حالة المفعول غير المباشر", {
    formula: ["wem?", "→", "dem / der / den …n"],
    ex: "Ich fahre mit [dem] Auto.",
    exAr: "بعد mit, bei, zu, aus … وبعد أفعال زي helfen.",
    branches: [
      B("Artikel", "الأدوات", "violet", [
        K("der/das → [dem]", "المذكر والمحايد", "mit dem Bus"),
        K("die → [der]", "المؤنث", "mit der Bahn"),
        K("Plural: [den] …[n]", "الجمع + ‎n‎", "mit den Kinder[n]"),
      ]),
      B("Indefinit", "النكرة", "amber", [
        K("[einem] · [einer]", "", "Ich wohne bei einer Freundin."),
      ]),
      B("Wann?", "إمتى نستخدمه", "green", [
        K(
          "nach mit · bei · zu · aus …",
          "بعد حروف جر معيّنة",
          "Ich gehe zum Arzt.",
        ),
        K("helfen · danken · gefallen", "بعد أفعال معيّنة", "Das gefällt mir."),
      ]),
    ],
  }),
  L(19, "a1-possessiv", CH.nomen, "Possessivartikel", "أدوات الملكية", {
    formula: ["mein", "·", "dein", "·", "sein …"],
    ex: "Das ist [mein] Bruder und [meine] Schwester.",
    exAr: "بتاعي · بتاعك … ونهايتها زي ein.",
    branches: [
      B("Formen", "الأشكال", "green", [
        K("ich → [mein] · du → [dein]", "", ""),
        K("er/es → [sein] · sie → [ihr]", "", "Sie liebt ihren Hund."),
        K(
          "wir → [unser] · ihr → [euer] · sie/Sie → [ihr]/[Ihr]",
          "",
          "Ist das Ihr Koffer?",
        ),
      ]),
      B("Endungen", "النهايات زي ein", "blue", [
        K("mein Vater · mein[e] Mutter", "مع المؤنث والجمع ‎-e", ""),
        K(
          "Akk.: mein[en] Vater",
          "المذكر في Akkusativ ‎-en",
          "Ich besuche meinen Opa.",
        ),
      ]),
    ],
  }),
  L(
    20,
    "a1-welcher-dieser",
    CH.nomen,
    "Artikel: interrogativ und demonstrativ",
    "welcher و dieser",
    {
      formula: ["welcher?", "→", "dieser"],
      ex: "[Welcher] Pullover? — [Dieser] hier!",
      exAr: "نهاياتهم زي der/die/das بالظبط.",
      branches: [
        B("welch-", "أنهي؟", "blue", [
          K(
            "[welcher] · [welche] · [welches]",
            "مذكر · مؤنث · محايد",
            "Welche Farbe magst du?",
          ),
          K("Akk.: [welchen]", "", "Welchen Film siehst du?"),
        ]),
        B("dies-", "ده / دي", "green", [
          K("[dieser] · [diese] · [dieses]", "", "Dieses Buch ist toll."),
          K(
            "Akk.: [diesen]",
            "",
            "Ich nehme diesen Tisch.",
            "-er -e -es = der die das",
          ),
        ]),
      ],
    },
  ),
  L(
    21,
    "a1-pronomen-akk-dat",
    CH.nomen,
    "Personalpronomen: Akkusativ und Dativ",
    "الضمائر في Akkusativ و Dativ",
    {
      formula: ["ich", "→", "mich", "·", "mir"],
      ex: "Hilfst du [mir]? Ich rufe [dich] an.",
      exAr: "الضمير بيتغيّر حسب الحالة.",
      branches: [
        B("Akkusativ", "مفعول به", "rose", [
          K("ich → [mich] · du → [dich]", "", "Ich liebe dich."),
          K("er → [ihn] · sie → [sie] · es → [es]", "", "Ich kenne ihn."),
          K("wir → [uns] · ihr → [euch]", "", ""),
        ]),
        B("Dativ", "مفعول غير مباشر", "violet", [
          K("ich → [mir] · du → [dir]", "", "Das gefällt mir."),
          K("er/es → [ihm] · sie → [ihr]", "", "Ich helfe ihr."),
          K("sie/Sie → [ihnen]/[Ihnen]", "", "Wie geht es Ihnen?"),
        ]),
      ],
      phrases: ["Wie geht es dir?", "Ich danke dir."],
    },
  ),
  L(
    25,
    "a1-praeteritum-sein-haben",
    CH.verben2,
    "Präteritum: sein und haben",
    "الماضي من sein و haben",
    {
      formula: ["sein", "→", "war", "·", "haben", "→", "hatte"],
      ex: "Gestern [war] ich krank und [hatte] Fieber.",
      exAr: "مع sein و haben بنستخدم الماضي البسيط في الكلام.",
      branches: [
        B("sein → war", "كان", "violet", [
          K("ich/er [war] · du [warst]", "", "Wo warst du?"),
          K("wir/sie [waren] · ihr [wart]", "", "Wir waren im Urlaub."),
        ]),
        B("haben → hatte", "كان عنده", "green", [
          K("ich/er [hatte] · du [hattest]", "", "Ich hatte keine Zeit."),
          K(
            "wir/sie [hatten] · ihr [hattet]",
            "",
            "Hattet ihr Spaß?",
            "ich = er (keine Endung)",
          ),
        ]),
      ],
    },
  ),
  L(
    26,
    "a1-perfekt-haben",
    CH.verben2,
    "Perfekt mit haben",
    "الماضي التام مع haben",
    {
      formula: ["haben", "Pos. 2", "…", "Partizip II", "Ende"],
      ex: "Ich [habe] gestern Pizza [gegessen].",
      exAr: "ده الماضي اللي بنتكلم بيه، وأغلب الأفعال بتاخد haben.",
      branches: [
        B("Regelmäßig", "أفعال منتظمة", "green", [
          K("[ge]mach[t]", "ge + جذر + t", "Was hast du gemacht?"),
          K("[ge]kauf[t]", "", "Ich habe Brot gekauft."),
        ]),
        B("Unregelmäßig", "أفعال غير منتظمة", "amber", [
          K(
            "[ge]seh[en] · [ge]trunk[en]",
            "ge + … + en",
            "Wir haben einen Film gesehen.",
            "Liste lernen!",
          ),
        ]),
        B("Satzklammer", "قوس الجملة", "blue", [
          K("haben (Pos. 2) … Partizip (Ende)", "", "Er hat lange geschlafen."),
        ]),
      ],
    },
  ),
  L(
    32,
    "a1-temporale-praep",
    CH.praep1,
    "Temporale Präpositionen",
    "حروف الجر للوقت",
    {
      formula: ["Wann?", "→", "am · um · im"],
      ex: "[Am] Montag [um] 8 Uhr.",
      exAr: "كل نوع وقت ليه حرف جر.",
      branches: [
        B("am", "الأيام وأجزاء اليوم", "green", [
          K(
            "[am] Montag · [am] Abend",
            "",
            "Am Wochenende schlafe ich lange.",
            "Ausnahme: in der Nacht",
          ),
        ]),
        B("um · im", "الساعة · الشهور والفصول", "blue", [
          K("[um] 7 Uhr", "الساعة بالظبط", "Der Kurs beginnt um 9."),
          K("[im] Mai · [im] Sommer", "الشهور والفصول", "Im Juli ist es heiß."),
        ]),
        B("von … bis · seit", "من … لحد · من ساعة", "amber", [
          K("[von] 9 [bis] 12 Uhr", "مدة", ""),
          K(
            "[seit] zwei Jahren",
            "بقالي …",
            "Ich lerne seit zwei Jahren Deutsch.",
          ),
        ]),
      ],
    },
  ),
  L(
    33,
    "a1-praep-dativ",
    CH.praep1,
    "Präpositionen mit Dativ",
    "حروف جر بتاخد Dativ",
    {
      formula: ["aus · bei · mit · nach", "+", "Dativ"],
      ex: "Ich komme [aus] [der] Türkei.",
      exAr: "بعد الحروف دي الاسم دايمًا Dativ.",
      branches: [
        B("Die Liste", "الحروف", "violet", [
          K(
            "[aus] · [bei] · [mit] · [nach]",
            "من · عند · مع · لـ/بعد",
            "Ich fahre mit dem Bus.",
          ),
          K(
            "[seit] · [von] · [zu]",
            "من ساعة · من · لـ",
            "Ich gehe zu meiner Oma.",
          ),
        ]),
        B("Kurzformen", "الدمج", "green", [
          K("zu + dem = [zum]", "", "Ich gehe zum Arzt."),
          K(
            "zu + der = [zur] · von + dem = [vom]",
            "",
            "Sie fährt zur Arbeit.",
            "aus-bei-mit-nach-seit-von-zu",
          ),
        ]),
      ],
    },
  ),
  L(
    34,
    "a1-praep-akkusativ",
    CH.praep1,
    "Präpositionen mit Akkusativ",
    "حروف جر بتاخد Akkusativ",
    {
      formula: ["für · um · durch · ohne · gegen", "+", "Akk."],
      ex: "Das Geschenk ist [für] [dich].",
      exAr: "بعد الحروف دي الاسم دايمًا Akkusativ.",
      branches: [
        B("Die Liste", "الحروف", "rose", [
          K("[für]", "علشان / لـ", "Ich kaufe Blumen für meine Mutter."),
          K("[ohne]", "من غير", "Ich trinke Kaffee ohne Zucker."),
          K(
            "[durch] · [um] · [gegen]",
            "عبر · حوالين · ضد",
            "Wir gehen durch den Park.",
            "FUDOG: für um durch ohne gegen",
          ),
        ]),
      ],
    },
  ),
  L(
    35,
    "a1-wechselpraep-dativ",
    CH.praep1,
    "Wechselpräpositionen mit Dativ",
    "حروف المكان مع Dativ (فين؟)",
    {
      formula: ["Wo?", "→", "in · an · auf …", "+", "Dativ"],
      ex: "Das Buch liegt [auf] [dem] Tisch.",
      exAr: "لما نسأل «فين؟» (مكان ثابت) بنستخدم Dativ.",
      branches: [
        B("Die Neun", "التسعة", "blue", [
          K(
            "[in] · [an] · [auf]",
            "في · على (جنب) · على (فوق)",
            "Ich bin in der Schule.",
          ),
          K(
            "[über] · [unter] · [vor] · [hinter]",
            "فوق · تحت · قدام · ورا",
            "Die Katze schläft unter dem Bett.",
          ),
          K("[neben] · [zwischen]", "جنب · بين", ""),
        ]),
        B("Kurzformen", "الدمج", "green", [
          K("in + dem = [im] · an + dem = [am]", "", "Ich wohne im Zentrum."),
        ]),
      ],
    },
  ),
  L(
    44,
    "a1-und-aber-oder",
    CH.satz1,
    "Hauptsätze verbinden (Position 0)",
    "ربط جملتين: und, aber, oder, denn",
    {
      formula: ["Satz 1", "+", "und/aber …", "+", "Satz 2"],
      ex: "Ich bin müde, [aber] ich lerne noch.",
      exAr: "أداة الربط مش بتغيّر ترتيب الجملة (مكانها صفر).",
      branches: [
        B("Die Vier", "الأربعة", "green", [
          K("[und]", "و", "Ich koche und du deckst den Tisch."),
          K("[aber]", "لكن", "Das Essen ist gut, aber teuer."),
          K("[oder]", "أو", "Trinkst du Tee oder Kaffee?"),
          K(
            "[denn]",
            "لأن",
            "Ich bleibe zu Hause, denn ich bin krank.",
            "denn = weil, aber Position 0",
          ),
        ]),
      ],
    },
  ),
  L(47, "a1-komposita", CH.woerter, "Komposita", "الكلمات المركّبة", {
    formula: ["Wort 1", "+", "Wort 2", "=", "Artikel von Wort 2"],
    ex: "die Kinder + [der] Arzt = [der] Kinderarzt",
    exAr: "آخر كلمة هي اللي بتحدد المعنى والأداة.",
    branches: [
      B("Nomen + Nomen", "اسم + اسم", "green", [
        K("das Haus + [die] Tür = [die] Haustür", "", ""),
        K(
          "der Kinderarzt ≠ die Arztkinder",
          "الترتيب بيغيّر المعنى",
          "",
          "das letzte Wort ist der Chef",
        ),
      ]),
      B("Andere", "أنواع تانية", "amber", [
        K("schreib(en) + [der] Tisch", "فعل + اسم", "der Schreibtisch"),
        K("groß + die Stadt", "صفة + اسم", "die Großstadt"),
      ]),
    ],
  }),
  L(
    48,
    "a1-zusammengesetzte-verben",
    CH.woerter,
    "Zusammengesetzte Verben",
    "أفعال مركّبة",
    {
      formula: ["Wort", "+", "Verb"],
      ex: "Ich gehe heute [spazieren].",
      exAr: "فعل + فعل، أو اسم + فعل، بيعملوا معنى واحد.",
      branches: [
        B("Verb + Verb", "فعل + فعل", "blue", [
          K("[spazieren] gehen", "يتمشى", "Wir gehen am Abend spazieren."),
          K("[kennen] lernen", "يتعرّف على", "Ich möchte dich kennenlernen."),
        ]),
        B("Nomen + Verb", "اسم + فعل", "green", [
          K(
            "[Rad] fahren · [Ski] fahren",
            "يركب عجلة · يتزحلق",
            "Ich fahre gern Rad.",
          ),
          K("[Deutsch] lernen", "", ""),
        ]),
      ],
    },
  ),
  L(
    49,
    "a1-genusregeln",
    CH.woerter,
    "Genusregeln",
    "قواعد تساعدك تعرف الأداة",
    {
      formula: ["Endung", "→", "der / die / das"],
      ex: "die Zeit[ung] · der Lehr[er] · das Mäd[chen]",
      exAr: "نهاية الكلمة بتديك تلميح للأداة.",
      branches: [
        B("der", "مذكر", "blue", [
          K("-[er] · -[ling] · -[ismus]", "", "der Lehrer, der Frühling"),
          K(
            "Tage, Monate, Jahreszeiten",
            "الأيام والشهور والفصول",
            "der Montag, der Mai",
          ),
        ]),
        B("die", "مؤنث", "rose", [
          K("-[ung] · -[heit] · -[keit]", "", "die Wohnung, die Freiheit"),
          K("-[schaft] · -[ion] · -[tät]", "", "die Freundschaft, die Nation"),
        ]),
        B("das", "محايد", "green", [
          K("-[chen] · -[lein]", "التصغير دايمًا das", "das Mädchen"),
          K("-[ment] · -[um]", "", "das Instrument, das Zentrum"),
        ]),
      ],
    },
  ),
];
