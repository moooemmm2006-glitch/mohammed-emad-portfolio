import type { GrammarLesson } from "../../src/lib/grammarTypes";
import { B, CH, K, lesson } from "./build";

const L = (
  no: number,
  id: string,
  ch: (typeof CH)[keyof typeof CH],
  de: string,
  ar: string,
  map: Parameters<typeof lesson>[6],
) => lesson("B1", no, id, ch, de, ar, map);

export const B1_MAP: GrammarLesson[] = [
  L(43, "b1-superlativ", CH.adj1, "Superlativ", "صيغة التفضيل (الأكتر)", {
    formula: ["am", "+", "Adjektiv", "+", "-sten"],
    ex: "Der kleinste Mann läuft [am schnellsten].",
    exAr: "الأكتر في المجموعة كلها.",
    branches: [
      B("am …sten", "بعد الفعل", "green", [
        K("schnell → [am] schnell[sten]", "", "Wer läuft am schnellsten?"),
        K("alt → am [ä]lte[sten]", "بعد t/d/s/z ‎-esten", ""),
      ]),
      B("der …ste", "قبل الاسم", "blue", [
        K(
          "der schnell[ste] Läufer",
          "بنهاية صفة عادية",
          "Das ist das beste Restaurant.",
        ),
      ]),
      B("Unregelmäßig", "شواذ", "rose", [
        K("gut → am [besten]", "", ""),
        K(
          "viel → am [meisten] · gern → am [liebsten]",
          "",
          "Ich esse am liebsten Pizza.",
        ),
      ]),
    ],
  }),
  L(52, "b1-negationswoerter", CH.woerter, "Negationswörter", "كلمات النفي", {
    formula: ["nicht · kein", "·", "nichts · nie · niemand"],
    ex: "Ich habe [noch nicht] gegessen und [nichts] getrunken.",
    exAr: "كل كلمة إيجابية ليها عكس.",
    branches: [
      B("Paare", "الأزواج", "rose", [
        K("etwas ↔ [nichts]", "حاجة ↔ ولا حاجة", "Ich sehe nichts."),
        K("jemand ↔ [niemand]", "حد ↔ ولا حد", "Niemand ist da."),
        K("immer ↔ [nie]", "دايمًا ↔ أبدًا", "Er kommt nie pünktlich."),
        K("irgendwo ↔ [nirgends]", "في أي حتة ↔ ولا حتة", ""),
      ]),
      B("Zeit", "مع الوقت", "blue", [
        K(
          "schon ↔ [noch nicht]",
          "خلاص ↔ لسه",
          "Bist du schon fertig? — Noch nicht.",
        ),
        K("noch ↔ [nicht mehr]", "لسه ↔ مبقاش", "Ich rauche nicht mehr."),
      ]),
    ],
  }),
  L(
    53,
    "b1-lokale-adverbien",
    CH.woerter,
    "Lokale Adverbien: Position und Direktion",
    "ظروف المكان والاتجاه",
    {
      formula: ["oben", "·", "nach oben", "·", "von oben"],
      ex: "Ich bin [oben]. Komm auch [nach oben].",
      exAr: "مكان ثابت · رايح لـ · جاي من.",
      branches: [
        B("Wo?", "فين؟", "blue", [
          K("[oben] · [unten]", "فوق · تحت", ""),
          K(
            "[drinnen] · [draußen]",
            "جوه · بره",
            "Die Kinder spielen draußen.",
          ),
          K("[hier] · [dort]", "هنا · هناك", ""),
        ]),
        B("Wohin?", "لفين؟", "green", [
          K("[nach oben] · [nach unten]", "", "Wir gehen nach unten."),
          K("[rein] · [raus] · [hierher]", "", "Komm rein!"),
        ]),
        B("Woher?", "منين؟", "amber", [
          K("[von oben] · [von draußen]", "", "Der Lärm kommt von draußen."),
        ]),
      ],
    },
  ),
  L(54, "b1-praeteritum", CH.verben3, "Präteritum", "الماضي البسيط", {
    formula: ["Stamm", "+", "-te", "·", "Ablaut"],
    ex: "Er [kam], [sah] und [sagte] nichts.",
    exAr: "زمن الحكايات والكتابة.",
    branches: [
      B("Regelmäßig", "منتظم", "green", [
        K("sagen → sag[te]", "", "Er sagte nichts."),
        K("arbeiten → arbeit[ete]", "", ""),
      ]),
      B("Unregelmäßig", "غير منتظم", "rose", [
        K(
          "kommen → [kam] · sehen → [sah]",
          "حرف العلة بيتغيّر",
          "Sie kam spät nach Hause.",
        ),
        K(
          "gehen → [ging] · finden → [fand]",
          "",
          "",
          "ich = er (keine Endung)",
        ),
      ]),
      B("Gebrauch", "الاستخدام", "blue", [
        K("geschrieben", "القصص والأخبار والجرايد", "Es war einmal ein König."),
        K("gesprochen: Perfekt", "في الكلام غالبًا Perfekt", ""),
      ]),
    ],
  }),
  L(55, "b1-plusquamperfekt", CH.verben3, "Plusquamperfekt", "الماضي الأسبق", {
    formula: ["hatte / war", "+", "Partizip II"],
    ex: "Ich [hatte] zu lange [geschlafen].",
    exAr: "حاجة حصلت قبل حاجة تانية في الماضي.",
    branches: [
      B("Bildung", "التكوين", "violet", [
        K("[hatte] … gemacht", "", "Ich hatte schon gegessen."),
        K("[war] … gegangen", "", "Der Zug war schon abgefahren."),
      ]),
      B("Zeitstrahl", "خط الزمن", "amber", [
        K(
          "zuerst: Plusquamperfekt",
          "اللي حصل الأول",
          "Nachdem ich gegessen hatte, ging ich los.",
          "1. Plusquamperfekt → 2. Präteritum",
        ),
      ]),
    ],
  }),
  L(
    56,
    "b1-reflexiv-akk-dat",
    CH.verben3,
    "Reflexivpronomen im Akkusativ und Dativ",
    "الضمير الانعكاسي في Akkusativ و Dativ",
    {
      formula: ["mich", "↔", "mir"],
      ex: "Ich wasche [mich]. Ich wasche [mir] die Hände.",
      exAr: "لو فيه مفعول تاني، الضمير بيبقى Dativ.",
      branches: [
        B("Akkusativ", "من غير مفعول تاني", "rose", [
          K("ich wasche [mich]", "", "Ich ziehe mich an."),
        ]),
        B("Dativ", "مع مفعول تاني", "violet", [
          K("ich wasche [mir] die Hände", "", "Ich putze mir die Zähne."),
          K(
            "du → [dir]",
            "بس ich و du بيختلفوا",
            "Kauf dir etwas Schönes!",
            "er/sie/wir … gleich",
          ),
        ]),
      ],
    },
  ),
  L(
    57,
    "b1-trennbar-untrennbar",
    CH.verben3,
    "Trennbare und untrennbare Verben",
    "أفعال بتنفصل وأفعال لأ",
    {
      formula: ["an-/auf-/ein-", "·", "be-/ver-/er-"],
      ex: "Ich [rufe] dich [an]. Ich [besuche] dich.",
      exAr: "بادئات بتنفصل وبادئات عمرها ما بتنفصل.",
      branches: [
        B("Trennbar", "بتنفصل (عليها الضغط)", "green", [
          K(
            "[an]rufen · [auf]machen · [ein]kaufen",
            "",
            "Er kauft im Supermarkt ein.",
          ),
          K("Partizip: an[ge]rufen", "", ""),
        ]),
        B("Untrennbar", "مش بتنفصل", "rose", [
          K(
            "[be]suchen · [ver]stehen · [er]zählen",
            "be- ge- er- ver- zer- ent- emp- miss-",
            "Ich verstehe dich.",
          ),
          K("Partizip: [be]sucht (ohne ge-)", "", "Ich habe ihn besucht."),
        ]),
        B("Beides", "الاتنين بمعنى مختلف", "amber", [
          K(
            "[über]setzen · [um]fahren",
            "",
            "Er übersetzt den Text.",
            "Betonung entscheidet",
          ),
        ]),
      ],
    },
  ),
  L(
    58,
    "b1-verben-praep",
    CH.verben3,
    "Verben mit Präpositionen",
    "أفعال ليها حرف جر ثابت",
    {
      formula: ["Verb", "+", "feste Präposition"],
      ex: "Sie freut sich [über] die Blumen.",
      exAr: "الفعل وحرف الجر بيتحفظوا مع بعض.",
      branches: [
        B("+ Akkusativ", "حرف جر + Akkusativ", "rose", [
          K(
            "warten [auf] · denken [an]",
            "يستنى · يفكر في",
            "Ich warte auf den Bus.",
          ),
          K(
            "sich freuen [über] / [auf]",
            "يفرح بـ (حصل) / يستنى بفرحة",
            "Ich freue mich auf den Urlaub.",
          ),
        ]),
        B("+ Dativ", "حرف جر + Dativ", "violet", [
          K(
            "sprechen [mit] · träumen [von]",
            "يتكلم مع · يحلم بـ",
            "Ich träume von einer Reise.",
          ),
          K(
            "Angst haben [vor]",
            "يخاف من",
            "Sie hat Angst vor Hunden.",
            "immer Verb + Präposition lernen",
          ),
        ]),
      ],
    },
  ),
  L(
    59,
    "b1-dafuer-wofuer",
    CH.verben3,
    "Präpositionaladverbien und -pronomen",
    "dafür و wofür",
    {
      formula: ["da(r)", "+", "Präposition", "·", "wo(r)", "+", "Präp."],
      ex: "Ich warte auf den Bus. — Ich warte auch [darauf].",
      exAr: "للحاجات: da-/wo-، للأشخاص: حرف جر + ضمير.",
      branches: [
        B("Sachen", "حاجات", "green", [
          K(
            "[da]für · [dar]auf · [dar]über",
            "قبل حرف متحرك ‎r",
            "Ich interessiere mich dafür.",
          ),
          K("[Wo]für? · [Wor]auf?", "السؤال", "Worauf wartest du?"),
        ]),
        B("Personen", "أشخاص", "blue", [
          K("auf [ihn] · mit [ihr]", "", "Ich warte auf ihn."),
          K(
            "Auf [wen]? · Mit [wem]?",
            "",
            "Mit wem sprichst du?",
            "Person → Präp. + Pronomen",
          ),
        ]),
      ],
    },
  ),
  L(
    60,
    "b1-konjunktiv2-formen",
    CH.verben3,
    "Konjunktiv II: Formen",
    "صيغة التمني: الأشكال",
    {
      formula: ["würde", "+", "Infinitiv", "·", "wäre · hätte"],
      ex: "Ich [würde] gern reisen. Ich [wäre] gern reich.",
      exAr: "أغلب الأفعال بـ würde، وأفعال قليلة ليها شكل خاص.",
      branches: [
        B("würde + Infinitiv", "الشكل العام", "violet", [
          K("ich [würde] … kaufen", "", "Ich würde ein Haus kaufen."),
        ]),
        B("Eigene Formen", "أشكال خاصة", "amber", [
          K("sein → [wäre] · haben → [hätte]", "", "Ich hätte gern mehr Zeit."),
          K(
            "können → [könnte] · müssen → [müsste]",
            "",
            "Könntest du mir helfen?",
          ),
          K("dürfen → [dürfte] · sollen → [sollte]", "", ""),
        ]),
      ],
    },
  ),
  L(
    61,
    "b1-konjunktiv2-gebrauch",
    CH.verben3,
    "Konjunktiv II: Gebrauch",
    "صيغة التمني: الاستخدام",
    {
      formula: ["Wunsch", "·", "Rat", "·", "Höflichkeit", "·", "irreal"],
      ex: "[Wenn] ich viel Geld [hätte], [würde] ich reisen.",
      exAr: "للتمني والنصيحة والأدب وحاجات مش حقيقية.",
      branches: [
        B("Wunsch", "تمني", "green", [
          K("Ich [wäre] gern …", "", "Ich wäre gern am Meer."),
          K("[Wenn] ich doch … [hätte]!", "يا ريت", ""),
        ]),
        B("Rat & Höflichkeit", "نصيحة وأدب", "blue", [
          K("Du [solltest] …", "المفروض", "Du solltest mehr schlafen."),
          K("[Könnten] Sie …?", "ممكن حضرتك؟", "Könnten Sie mir helfen?"),
        ]),
        B("Irreal", "شرط مش حقيقي", "rose", [
          K(
            "Wenn …, [würde] …",
            "",
            "Wenn ich Zeit hätte, würde ich kommen.",
            "Realität: Ich habe keine Zeit.",
          ),
        ]),
      ],
    },
  ),
  L(62, "b1-passiv", CH.verben3, "Passiv", "المبني للمجهول", {
    formula: ["werden", "+", "Partizip II"],
    ex: "Der Baum [wird] [gepflanzt].",
    exAr: "المهم الحدث، مش مين عمله.",
    branches: [
      B("Präsens", "المضارع", "green", [
        K("[wird] gemacht", "", "Hier wird Deutsch gesprochen."),
        K("[werden] gebaut", "", "Neue Häuser werden gebaut."),
      ]),
      B("von + Dativ", "مين عمله (لو مهم)", "blue", [
        K(
          "… [von] dem Gärtner",
          "",
          "Der Baum wird von meinem Vater gepflanzt.",
        ),
      ]),
      B("Aktiv → Passiv", "من المعلوم للمجهول", "amber", [
        K(
          "Akk. → Nominativ",
          "المفعول يبقى فاعل",
          "Man repariert das Auto. → Das Auto wird repariert.",
        ),
      ]),
    ],
  }),
  L(
    63,
    "b1-passiv-vergangenheit",
    CH.verben3,
    "Passiv in der Vergangenheit",
    "المبني للمجهول في الماضي",
    {
      formula: ["wurde", "+", "Partizip", "·", "ist … worden"],
      ex: "Wann [wurde] der Kölner Dom [gebaut]?",
      exAr: "Präteritum بـ wurde، و Perfekt بـ worden.",
      branches: [
        B("Präteritum", "الماضي البسيط", "violet", [
          K("[wurde] gebaut", "", "Das Haus wurde 1900 gebaut."),
        ]),
        B("Perfekt", "الماضي التام", "green", [
          K(
            "[ist] … gebaut [worden]",
            "worden مش geworden",
            "Das Auto ist repariert worden.",
            "Passiv: worden, nicht geworden",
          ),
        ]),
      ],
    },
  ),
  L(
    64,
    "b1-futur",
    CH.verben3,
    "Vermutung und Zukunft mit Futur I",
    "المستقبل والتخمين",
    {
      formula: ["werden", "+", "Infinitiv"],
      ex: "Der Präsident [wird] Japan [besuchen].",
      exAr: "للمستقبل الرسمي، وللتخمين.",
      branches: [
        B("Zukunft", "مستقبل", "blue", [
          K("ich [werde] … lernen", "", "Nächstes Jahr werde ich studieren."),
          K(
            "oft: Präsens + Zeit",
            "في الكلام بنستخدم المضارع",
            "Morgen fahre ich nach Kairo.",
          ),
        ]),
        B("Vermutung", "تخمين", "amber", [
          K(
            "[wird] … sein",
            "+ wohl / bestimmt",
            "Er wird wohl krank sein.",
            "wohl = vielleicht",
          ),
        ]),
      ],
    },
  ),
  L(65, "b1-werden", CH.verben3, "Funktionen von werden", "استخدامات werden", {
    formula: ["werden", "=", "3 Funktionen"],
    ex: "Er [wird] Arzt. · Es [wird] gebaut. · Ich [werde] kommen.",
    exAr: "نفس الفعل بثلاث وظايف.",
    branches: [
      B("Vollverb", "يصبح", "green", [
        K("[werden] + Nomen/Adj.", "", "Es wird kalt."),
      ]),
      B("Passiv", "المجهول", "blue", [
        K("[werden] + Partizip II", "", "Das Essen wird gekocht."),
      ]),
      B("Futur", "المستقبل", "violet", [
        K("[werden] + Infinitiv", "", "Wir werden sehen."),
      ]),
      B("Konjunktiv", "التمني", "amber", [
        K("[würde] + Infinitiv", "", "Ich würde gern kommen."),
      ]),
    ],
  }),
  L(66, "b1-lassen", CH.verben3, "Das Verb lassen", "الفعل lassen", {
    formula: ["lassen", "+", "Infinitiv"],
    ex: "Ich [lasse] mein Auto [reparieren].",
    exAr: "حد تاني بيعمل الحاجة، أو بنسيب حاجة.",
    branches: [
      B("veranlassen", "يخلّي حد يعمل", "green", [
        K("[lassen] + Infinitiv", "", "Sie lässt sich die Haare schneiden."),
      ]),
      B("erlauben", "يسمح", "blue", [
        K("Lass mich [gehen]!", "", "Meine Eltern lassen mich allein reisen."),
      ]),
      B("zurücklassen", "يسيب", "amber", [
        K(
          "[lassen] + Akkusativ",
          "",
          "Ich lasse das Handy zu Hause.",
          "Perfekt: hat … reparieren lassen",
        ),
      ]),
    ],
  }),
  L(
    67,
    "b1-stellen-stehen",
    CH.verben3,
    "Positions- und Direktionsverben",
    "stehen/stellen · liegen/legen …",
    {
      formula: ["Wo? (Dat.)", "↔", "Wohin? (Akk.)"],
      ex: "Ich [stelle] die Vase auf den Tisch. Sie [steht] auf dem Tisch.",
      exAr: "فعل للحركة (Akk.) وفعل للحالة (Dat.).",
      branches: [
        B("Wohin? → Akk.", "حركة (منتظم)", "rose", [
          K(
            "[stellen] · [legen]",
            "يحط واقف · يحط نايم",
            "Ich lege das Buch auf den Tisch.",
          ),
          K(
            "[setzen] · [hängen]",
            "يقعّد · يعلّق",
            "Ich hänge das Bild an die Wand.",
          ),
        ]),
        B("Wo? → Dat.", "حالة (غير منتظم)", "blue", [
          K(
            "[stehen] · [liegen]",
            "واقف · نايم",
            "Das Buch liegt auf dem Tisch.",
          ),
          K(
            "[sitzen] · [hängen]",
            "قاعد · متعلّق",
            "Das Bild hängt an der Wand.",
            "legen → liegen, stellen → stehen",
          ),
        ]),
      ],
    },
  ),
  L(68, "b1-genitiv", CH.nomen2, "Genitiv", "حالة الإضافة", {
    formula: ["des …s", "·", "der"],
    ex: "Das Auto [meines] Vater[s].",
    exAr: "عربية بابا — الملكية في الكتابة والكلام الرسمي.",
    branches: [
      B("Artikel", "الأدوات", "violet", [
        K(
          "der/das → [des] …[s]",
          "المذكر والمحايد + ‎s",
          "das Haus des Lehrers",
        ),
        K("die / Plural → [der]", "المؤنث والجمع", "die Farbe der Blume"),
      ]),
      B("Namen", "الأسماء", "green", [
        K("Sara[s] Buch", "", "Peters Auto ist neu."),
      ]),
      B("Gesprochen", "في الكلام", "amber", [
        K(
          "von + Dativ",
          "بديل أسهل",
          "das Auto von meinem Vater",
          "geschrieben: Genitiv",
        ),
      ]),
    ],
  }),
  L(69, "b1-n-deklination", CH.nomen2, "n-Deklination", "أسماء بتاخد ‎-n", {
    formula: ["maskulin", "+", "-(e)n"],
    ex: "Kennen Sie den Herr[n]?",
    exAr: "أسماء مذكرة بتاخد ‎-n‎ في كل الحالات إلا Nominativ.",
    branches: [
      B("Typisch", "أشهرها", "rose", [
        K(
          "der Junge → den Junge[n]",
          "‎-e‎ أشخاص وحيوانات",
          "Ich sehe den Jungen.",
        ),
        K(
          "der Student → dem Student[en]",
          "‎-ent · -ist · -ant",
          "Ich helfe dem Studenten.",
        ),
      ]),
      B("Wichtig", "لازم تتحفظ", "blue", [
        K("der Herr → den Herr[n]", "", ""),
        K(
          "der Kollege · der Nachbar · der Mensch",
          "",
          "Ich frage meinen Nachbarn.",
          "nur Nominativ ohne -n",
        ),
      ]),
    ],
  }),
  L(
    70,
    "b1-adjektiv-person",
    CH.nomen2,
    "Adjektive für Personen als Nomen",
    "صفات بقت أسماء لأشخاص",
    {
      formula: ["Adjektiv", "→", "der/die …e"],
      ex: "[Der] Jugendlich[e] — [ein] Jugendlich[er]",
      exAr: "الصفة بتبقى اسم بحرف كبير، ونهايتها زي الصفة.",
      branches: [
        B("Beispiele", "أمثلة", "green", [
          K(
            "der Deutsch[e] · ein Deutsch[er]",
            "",
            "Mein Nachbar ist ein Deutscher.",
          ),
          K(
            "der/die Bekannt[e] · Verwandt[e]",
            "معرفة · قريب",
            "Ich besuche meine Verwandten.",
          ),
          K("der/die Erwachsen[e]", "البالغ", ""),
        ]),
      ],
    },
  ),
  L(
    71,
    "b1-adjektiv-neutral",
    CH.nomen2,
    "Adjektive als neutrale Nomen",
    "صفات بقت أسماء محايدة",
    {
      formula: ["etwas / nichts / alles", "+", "Adj. als Nomen"],
      ex: "[Alles] Gut[e]! — [Etwas] Neu[es]?",
      exAr: "تعبيرات بالصفة كاسم محايد.",
      branches: [
        B("etwas / nichts", "حاجة / ولا حاجة", "amber", [
          K(
            "etwas Neu[es] · nichts Besonder[es]",
            "‎-es",
            "Gibt es etwas Neues?",
          ),
        ]),
        B("alles / das", "كل / الـ", "violet", [
          K("alles Gut[e] · das Gut[e]", "‎-e", "Alles Gute zum Geburtstag!"),
        ]),
      ],
    },
  ),
  L(
    72,
    "b1-indirekte-fragen",
    CH.satz2,
    "Indirekte Fragen",
    "السؤال غير المباشر",
    {
      formula: ["Wissen Sie,", "ob / W-Wort …", "Verb", "Ende"],
      ex: "Wissen Sie, [ob] der Zug pünktlich [ist]?",
      exAr: "سؤال مؤدب، والفعل بيروح الآخر.",
      branches: [
        B("Ja/Nein → ob", "سؤال أيوه/لأ", "green", [
          K(
            "Kommt er? → …, [ob] er kommt.",
            "",
            "Ich weiß nicht, ob er kommt.",
          ),
        ]),
        B("W-Frage → W-Wort", "سؤال بأداة", "blue", [
          K(
            "Wo wohnt sie? → …, [wo] sie wohnt.",
            "",
            "Können Sie mir sagen, wo der Bahnhof ist?",
            "höflich + Verb am Ende",
          ),
        ]),
      ],
    },
  ),
  L(73, "b1-infinitiv-zu", CH.satz2, "Infinitiv mit zu", "المصدر مع zu", {
    formula: ["…,", "zu", "+", "Infinitiv"],
    ex: "Es ist schön, ein Fest [zu] feiern.",
    exAr: "بعد أفعال وتعبيرات معيّنة.",
    branches: [
      B("Nach", "بعد", "green", [
        K(
          "versuchen · vergessen · anfangen",
          "",
          "Ich versuche, mehr zu lesen.",
        ),
        K("Es ist schön/wichtig …", "", "Es ist wichtig, Pausen zu machen."),
        K("Lust/Zeit haben", "", "Ich habe keine Lust zu kochen."),
      ]),
      B("Trennbar", "مع فعل بينفصل", "amber", [
        K(
          "an[zu]rufen",
          "zu في النص",
          "Vergiss nicht, mich anzurufen.",
          "auf-zu-stehen",
        ),
      ]),
    ],
  }),
  L(
    74,
    "b1-infinitiv-ohne-zu",
    CH.satz2,
    "Infinitiv ohne zu",
    "المصدر من غير zu",
    {
      formula: ["Modalverb · lassen · gehen", "+", "Infinitiv"],
      ex: "Ich will singen, [lass] mich [singen]!",
      exAr: "أفعال بتاخد المصدر على طول من غير zu.",
      branches: [
        B("Ohne zu", "من غير zu", "blue", [
          K("Modalverben", "", "Ich kann schwimmen."),
          K("lassen · gehen · bleiben", "", "Wir gehen essen."),
          K(
            "sehen · hören",
            "",
            "Ich höre ihn singen.",
            "Modal + lassen + gehen: kein zu",
          ),
        ]),
      ],
    },
  ),
  L(75, "b1-relativsaetze-1", CH.satz2, "Relativsätze 1", "جملة الصلة 1", {
    formula: ["Nomen,", "der/die/das", "…", "Verb", "Ende"],
    ex: "Das ist der Mann, [der] immer meine Nachbarin [besucht].",
    exAr: "جملة بتوصف الاسم، والفعل في آخرها.",
    branches: [
      B("Nominativ", "الضمير فاعل", "green", [
        K(
          "der Mann, [der] …",
          "",
          "Die Frau, die dort steht, ist meine Lehrerin.",
        ),
      ]),
      B("Akkusativ", "الضمير مفعول", "rose", [
        K(
          "der Mann, [den] ich kenne",
          "المذكر بس بيتغيّر",
          "Der Film, den ich sehe, ist spannend.",
        ),
      ]),
      B("Dativ", "مفعول غير مباشر", "violet", [
        K("der Mann, [dem] ich helfe", "", ""),
        K(
          "Plural: [denen]",
          "",
          "Die Kinder, denen ich helfe …",
          "Genus vom Nomen, Kasus vom Verb",
        ),
      ]),
    ],
  }),
  L(76, "b1-relativsaetze-2", CH.satz2, "Relativsätze 2", "جملة الصلة 2", {
    formula: ["Präposition", "+", "Relativpronomen"],
    ex: "Wie heißt das Ding, [mit dem] man …?",
    exAr: "حرف الجر بييجي قبل الضمير.",
    branches: [
      B("Präposition", "مع حرف جر", "blue", [
        K(
          "[mit dem] · [für den] · [über die]",
          "",
          "Das ist der Freund, mit dem ich reise.",
        ),
      ]),
      B("wo / was", "wo و was", "amber", [
        K("die Stadt, [wo] …", "للأماكن", "Kairo ist die Stadt, wo ich wohne."),
        K(
          "alles, [was] …",
          "بعد alles/etwas/nichts",
          "Das ist alles, was ich weiß.",
        ),
      ]),
    ],
  }),
  L(
    77,
    "b1-wenn-als",
    CH.satz2,
    "Temporale Nebensätze 1: wenn / als",
    "wenn ولا als",
    {
      formula: ["Vergangenheit einmal", "→", "als", "·", "sonst", "→", "wenn"],
      ex: "[Als] ich klein war, … / Immer [wenn] ich …",
      exAr: "als مرة واحدة في الماضي، wenn لأي حاجة متكررة أو حاضر.",
      branches: [
        B("als", "لما (مرة في الماضي)", "violet", [
          K("einmal · Vergangenheit", "", "Als ich 10 war, zogen wir um."),
        ]),
        B("wenn", "لما / كل ما", "green", [
          K(
            "Gegenwart / Zukunft",
            "",
            "Wenn ich nach Hause komme, rufe ich dich an.",
          ),
          K(
            "immer wenn (wiederholt)",
            "",
            "Immer wenn es regnet, bleibe ich zu Hause.",
            "einmal + früher = als",
          ),
        ]),
      ],
    },
  ),
  L(
    78,
    "b1-waehrend-bevor",
    CH.satz2,
    "Temporale Nebensätze 2",
    "während, bevor, nachdem, seit",
    {
      formula: ["während · bevor · nachdem · seit"],
      ex: "[Bevor] ich schlafe, lese ich.",
      exAr: "روابط بتوضح ترتيب الأحداث.",
      branches: [
        B("Gleichzeitig", "في نفس الوقت", "blue", [
          K("[während]", "أثناء", "Während ich koche, höre ich Musik."),
        ]),
        B("Vorher / Nachher", "قبل / بعد", "amber", [
          K("[bevor]", "قبل ما", "Bevor du gehst, mach das Licht aus."),
          K(
            "[nachdem] + Plusquamperfekt",
            "بعد ما",
            "Nachdem ich gegessen hatte, ging ich spazieren.",
          ),
        ]),
        B("Seit", "من ساعة ما", "green", [
          K("[seit]", "", "Seit ich hier wohne, bin ich glücklich."),
        ]),
      ],
    },
  ),
  L(
    79,
    "b1-um-zu-damit",
    CH.satz2,
    "Finalsätze: um … zu / damit",
    "الغرض: um … zu و damit",
    {
      formula: ["Ziel", "→", "um … zu", "·", "damit"],
      ex: "Ich lerne, [um] in Deutschland [zu] arbeiten.",
      exAr: "عشان … — نفس الشخص ← um … zu، شخص تاني ← damit.",
      branches: [
        B("um … zu", "نفس الفاعل", "green", [
          K(
            "…, [um] … [zu] + Infinitiv",
            "",
            "Ich spare, um ein Auto zu kaufen.",
          ),
        ]),
        B("damit", "فاعل مختلف", "violet", [
          K(
            "…, [damit] … Verb.",
            "",
            "Ich spreche langsam, damit du mich verstehst.",
            "gleiche Person → um … zu",
          ),
        ]),
      ],
    },
  ),
  L(
    80,
    "b1-doppelkonnektoren",
    CH.satz2,
    "Doppelkonnektoren",
    "روابط من جزئين",
    {
      formula: [
        "entweder … oder",
        "·",
        "weder … noch",
        "·",
        "sowohl … als auch",
      ],
      ex: "[Entweder] Tee [oder] Kaffee?",
      exAr: "رابطين بيشتغلوا مع بعض.",
      branches: [
        B("Auswahl", "اختيار", "blue", [
          K(
            "[entweder] … [oder]",
            "يا … يا",
            "Entweder komme ich heute oder morgen.",
          ),
        ]),
        B("Nichts", "ولا ده ولا ده", "rose", [
          K("[weder] … [noch]", "", "Ich trinke weder Tee noch Kaffee."),
        ]),
        B("Beides", "الاتنين", "green", [
          K(
            "[sowohl] … [als auch]",
            "كل من … و",
            "Sie spricht sowohl Deutsch als auch Englisch.",
          ),
          K(
            "[nicht nur] … [sondern auch]",
            "مش بس … لكن كمان",
            "Er ist nicht nur nett, sondern auch klug.",
          ),
        ]),
      ],
    },
  ),
  L(
    81,
    "b1-je-desto",
    CH.satz2,
    "Vergleichssätze: je … desto",
    "كل ما … كل ما",
    {
      formula: ["je", "+", "Komparativ …", "desto", "+", "Komparativ"],
      ex: "[Je] größer, [desto] besser!",
      exAr: "كل ما حاجة تزيد، حاجة تانية تزيد.",
      branches: [
        B("Satzbau", "ترتيب الجملة", "violet", [
          K("[Je] mehr ich lerne, …", "الفعل في الآخر", ""),
          K(
            "… [desto] besser [spreche] ich.",
            "الفعل بعد desto على طول",
            "Je mehr ich übe, desto sicherer werde ich.",
            "je = Nebensatz, desto = Hauptsatz",
          ),
        ]),
      ],
    },
  ),
  L(
    82,
    "b1-praep-genitiv",
    CH.praep2,
    "Präpositionen mit Genitiv",
    "حروف جر بتاخد Genitiv",
    {
      formula: ["wegen · trotz · während", "+", "Genitiv"],
      ex: "[Wegen] [des] Regens bleiben wir zu Hause.",
      exAr: "في الكتابة والكلام الرسمي بعدها Genitiv.",
      branches: [
        B("Die Liste", "الحروف", "rose", [
          K("[wegen]", "بسبب", "Wegen der Arbeit habe ich keine Zeit."),
          K("[trotz]", "بالرغم من", "Trotz des Wetters gehen wir raus."),
          K(
            "[während] · [innerhalb] · [außerhalb]",
            "أثناء · جوه · بره",
            "Innerhalb einer Woche.",
            "gesprochen oft + Dativ",
          ),
        ]),
      ],
    },
  ),
  L(
    83,
    "b1-temporale-praep-2",
    CH.praep2,
    "Temporale Präpositionen 2",
    "حروف جر للوقت 2",
    {
      formula: ["innerhalb · außerhalb · vor · nach · seit · bei"],
      ex: "[Nach] dem Essen · [vor] dem Kurs · [bei] der Arbeit",
      exAr: "إمتى؟ قبل؟ بعد؟ أثناء؟",
      branches: [
        B("+ Dativ", "مع Dativ", "violet", [
          K(
            "[vor] · [nach] · [seit] · [bei]",
            "قبل · بعد · من ساعة · أثناء",
            "Nach der Schule spiele ich Fußball.",
          ),
        ]),
        B("+ Genitiv", "مع Genitiv", "rose", [
          K(
            "[innerhalb] · [außerhalb] · [während]",
            "خلال · خارج · أثناء",
            "Während des Urlaubs habe ich viel gelesen.",
          ),
        ]),
      ],
    },
  ),
  L(
    84,
    "b1-adjektiv-ohne-artikel",
    CH.adj2,
    "Adjektivdeklination ohne Artikel",
    "نهاية الصفة من غير أداة",
    {
      formula: ["kein Artikel", "→", "Adjektiv zeigt den Kasus"],
      ex: "Deutsch[es] Bier · frisch[e] Milch",
      exAr: "الصفة بتاخد نهاية الأداة نفسها (der → -er).",
      branches: [
        B("Nominativ", "", "green", [
          K(
            "frisch[er] Kaffee · frisch[e] Milch · frisch[es] Brot",
            "",
            "Frisches Brot schmeckt gut.",
          ),
        ]),
        B("Akkusativ", "", "rose", [
          K(
            "frisch[en] Kaffee",
            "المذكر بس بيتغيّر",
            "Ich trinke schwarzen Tee.",
          ),
        ]),
        B("Dativ", "", "violet", [
          K(
            "mit frisch[em] Kaffee · frisch[er] Milch",
            "",
            "Ich koche mit frischem Gemüse.",
            "Endung = Artikel-Endung",
          ),
        ]),
      ],
    },
  ),
  L(
    85,
    "b1-partizip-1",
    CH.adj2,
    "Partizip I als Adjektiv",
    "اسم الفاعل كصفة",
    {
      formula: ["Infinitiv", "+", "d", "+", "Endung"],
      ex: "Schwimmen[d]e Vögel und fliegen[d]e Fische",
      exAr: "حاجة بتعمل الفعل دلوقتي.",
      branches: [
        B("Bildung", "التكوين", "teal", [
          K("schlafen → schlafen[d]", "", "das schlafende Kind"),
          K("+ Adjektivendung", "زي أي صفة", "Ich sehe einen lachenden Mann."),
        ]),
        B("Vergleich", "مقارنة", "amber", [
          K("Partizip I: [kochend]es Wasser", "بيحصل دلوقتي", ""),
          K("Partizip II: [gekocht]es Ei", "خلص", "", "I = aktiv, II = fertig"),
        ]),
      ],
    },
  ),
];
