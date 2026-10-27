// Rule-based report used when no API key is configured (and in tests / demo seeding).
// It finds a handful of very common learner mistakes with patterns, so the report,
// the weakness tracker and the "since last time" comparison can be tried end-to-end.

import { tagLabel } from "../levels";
import { countWords, splitSentences, tokenizeWords } from "../text";
import type { ReportContext } from "./context";
import type { LLMReport, WeaknessKind } from "./schema";

type Lang = "ar" | "en" | "de";

interface Detector {
  tag: string;
  pattern: RegExp;
  fix: (m: RegExpMatchArray, sentence: string) => string;
  explain: Record<Lang, string>;
  severity: "low" | "medium" | "high";
}

const SEIN_VERBS = "gegangen|gefahren|gekommen|geflogen|gelaufen|geblieben|aufgestanden|angekommen|umgezogen";
const MODALS = "kann|kannst|muss|musst|will|willst|möchte|möchtest|soll|darf";
const SEPARABLE: Record<string, [string, string]> = {
  anrufe: ["rufe", "an"],
  aufstehe: ["stehe", "auf"],
  einkaufe: ["kaufe", "ein"],
  mitkomme: ["komme", "mit"],
  ankomme: ["komme", "an"],
  fernsehe: ["sehe", "fern"],
  anfange: ["fange", "an"],
  aufräume: ["räume", "auf"],
};

const DETECTORS: Detector[] = [
  {
    tag: "perfekt",
    pattern: new RegExp(`\\b(habe|hast|hat|haben)\\b([^.?!]*?)\\b(${SEIN_VERBS})\\b`, "i"),
    fix: (m, s) => s.replace(m[1], ({ habe: "bin", hast: "bist", hat: "ist", haben: "sind" } as Record<string, string>)[m[1].toLowerCase()] ?? m[1]),
    explain: {
      ar: "أفعال الحركة وتغيير المكان (gehen, fahren, kommen, aufstehen) بتاخد sein مش haben في الـ Perfekt.",
      en: "Verbs of movement / change of place (gehen, fahren, kommen, aufstehen) take sein, not haben, in the Perfekt.",
      de: "Verben der Bewegung (gehen, fahren, kommen) bilden das Perfekt mit sein.",
    },
    severity: "medium",
  },
  {
    tag: "modalverben",
    // Lower-case infinitive (so nouns don't match), and not an article/adverb that happens to end in -en.
    pattern: new RegExp(
      `\\b(${MODALS})\\s+(?!(?:einen|keinen|meinen|deinen|seinen|ihren|unseren|diesen|jeden|allen|vielen|morgen|wieder|unten|oben|eben|gestern)\\b)([a-zäöüß]+en)\\s+([\\wäöüßÄÖÜ][^.?!]*)`,
    ),
    fix: (m, s) => s.replace(m[0], `${m[1]} ${m[3].trim()} ${m[2]}`),
    explain: {
      ar: "مع أفعال المودال (können, müssen, wollen…) الفعل التاني بيروح في آخر الجملة بالمصدر.",
      en: "With modal verbs (können, müssen, wollen…) the second verb goes to the END of the sentence in the infinitive.",
      de: "Bei Modalverben steht der Infinitiv am Satzende.",
    },
    severity: "high",
  },
  {
    tag: "trennbare_verben",
    pattern: new RegExp(`\\b(ich)\\s+(${Object.keys(SEPARABLE).join("|")})\\b([^.?!]*)`, "i"),
    fix: (m, s) => {
      const [verb, prefix] = SEPARABLE[m[2].toLowerCase()];
      return s.replace(m[0], `${m[1]} ${verb}${m[3].trimEnd()} ${prefix}`.replace(/\s+/g, " "));
    },
    explain: {
      ar: "الأفعال المنفصلة (anrufen, aufstehen, einkaufen) في المضارع البادئة بتاعتها بتروح آخر الجملة: Ich rufe dich an.",
      en: "Separable verbs (anrufen, aufstehen, einkaufen): in the present the prefix goes to the end: Ich rufe dich an.",
      de: "Trennbare Verben: Das Präfix steht am Satzende (Ich rufe dich an).",
    },
    severity: "medium",
  },
  {
    tag: "verb_position",
    pattern: /\b(weil|dass|wenn|ob)\s+(ich|du|er|sie|es|wir|ihr)\s+(bin|bist|ist|sind|habe|hast|hat|haben|kann|muss|will|gehe|arbeite|wohne|mag)\b([^.?!,]*)/i,
    fix: (m, s) => s.replace(m[0], `${m[1]} ${m[2]}${m[4].trimEnd()} ${m[3]}`.replace(/\s+/g, " ")),
    explain: {
      ar: "بعد weil / dass / wenn الفعل المصرَّف بيروح آخر الجملة الفرعية.",
      en: "After weil / dass / wenn the conjugated verb goes to the end of the clause.",
      de: "Nach weil/dass/wenn steht das konjugierte Verb am Ende des Nebensatzes.",
    },
    severity: "medium",
  },
  {
    tag: "dativ_akkusativ",
    pattern: /\b(mit|bei|von|zu|aus|nach)\s+(die|das)\b/i,
    fix: (m, s) => s.replace(m[0], `${m[1]} ${m[2].toLowerCase() === "die" ? "der" : "dem"}`),
    explain: {
      ar: "حروف الجر mit, bei, von, zu, aus, nach دايماً بتاخد Dativ: mit der Bahn, mit dem Auto.",
      en: "mit, bei, von, zu, aus, nach always take the dative: mit der Bahn, mit dem Auto.",
      de: "mit, bei, von, zu, aus, nach + Dativ.",
    },
    severity: "medium",
  },
  {
    tag: "konjugation",
    pattern: /\b(ich)\s+(ist|bist|sind|hat|hast|kommt|arbeitet|wohnt|macht)\b/i,
    fix: (m, s) => s.replace(m[0], `${m[1]} ${({ ist: "bin", bist: "bin", sind: "bin", hat: "habe", hast: "habe", kommt: "komme", arbeitet: "arbeite", wohnt: "wohne", macht: "mache" } as Record<string, string>)[m[2].toLowerCase()]}`),
    explain: {
      ar: "مع ich الفعل غالباً بينتهي بـ -e: ich komme, ich arbeite, ich bin, ich habe.",
      en: "With ich the verb usually ends in -e: ich komme, ich arbeite — and: ich bin, ich habe.",
      de: "Mit ich: ich komme, ich arbeite, ich bin, ich habe.",
    },
    severity: "high",
  },
];

const PITFALLS: { tag: string; test: RegExp; issue: Record<Lang, string>; tip: Record<Lang, string> }[] = [
  {
    tag: "pron_ch_sch",
    test: /ch/i,
    issue: { ar: "ممكن يتلخبط ch مع sch.", en: "ch can get mixed up with sch.", de: "ch und sch werden leicht verwechselt." },
    tip: {
      ar: "ich/nicht: صوت [ç] زي «هـ» مهموسة والشفايف مش مدوّرة. sch: الشفايف مدوّرة لقدّام.",
      en: "ich/nicht: [ç] is a soft hiss with spread lips; sch [ʃ] has rounded lips.",
      de: "ich: [ç] mit breiten Lippen; sch: [ʃ] mit runden Lippen.",
    },
  },
  {
    tag: "pron_umlaute",
    test: /[üöä]/i,
    issue: { ar: "الـ Umlaut (ü/ö) ممكن يتنطق u أو o.", en: "Umlauts ü/ö may come out as u/o.", de: "ü/ö klingen leicht wie u/o." },
    tip: {
      ar: "ü: قول «ي» وبعدين دوّر شفايفك من غير ما تحرك لسانك.",
      en: "ü: say 'ee', then round your lips without moving your tongue.",
      de: "ü: „i“ sagen und die Lippen runden.",
    },
  },
  {
    tag: "pron_p_b",
    test: /\bp|\bb/i,
    issue: { ar: "الفرق بين p و b (مش موجود في العربي).", en: "p vs b (Arabic has no p).", de: "p und b unterscheiden." },
    tip: {
      ar: "p فيها نفَس: حط ورقة قدام بُقك وقول Papier — لازم تتحرك.",
      en: "p is aspirated: hold paper in front of your mouth and say Papier — it should move.",
      de: "p ist behaucht: Papier vor den Mund halten.",
    },
  },
  {
    tag: "pron_z_w_v",
    test: /\bz|\bw|\bv/i,
    issue: { ar: "z = [ts]، w = [v]، v = [f] غالباً.", en: "z = [ts], w = [v], v = usually [f].", de: "z = [ts], w = [v], v = meist [f]." },
    tip: {
      ar: "Zeit = «تسايت»، Wasser = «ﭬاسر»، Vater = «فاتر».",
      en: "Zeit = 'tsite', Wasser = 'vasser', Vater = 'fahter'.",
      de: "Zeit [ts], Wasser [v], Vater [f].",
    },
  },
];

const T = {
  ar: {
    first: "دي أول جلسة ليك — مفيش مقارنة لسه. الجلسة الجاية هقارن بيها.",
    since: (prev: string) => `مقارنةً بآخر جلسة (${prev}):`,
    trendFew: "لسه الجلسات قليلة عشان نشوف اتجاه واضح.",
    trend: (d: number) => (d >= 0 ? `متوسط درجاتك في آخر الجلسات طالع بحوالي ${d} نقطة. استمر!` : `متوسط درجاتك نزل حوالي ${-d} نقطة — عادي، ركّز على نقطة واحدة كل مرة.`),
    impression: (w: number, t: number) => `اتكلمت ${t} مرة وقلت حوالي ${w} كلمة. ${w > 60 ? "ده مجهود حلو جداً!" : "حاول المرة الجاية تقول جمل أطول شوية."}`,
    disclaimer: "ملاحظات النطق دي استرشادية بس، مبنية على نص التعرّف على الكلام ودرجة الثقة، ومش تقييم معتمد.",
    lowConf: "الجهاز ماكانش متأكد من الكلمة دي — ممكن يكون في مشكلة نطق.",
    strengthTalk: "اتكلمت بالألماني من غير ما تقلب عربي",
    strengthQuestion: "سألت سؤال وشاركت في المحادثة",
    strengthLong: "قلت جملة كاملة وطويلة",
    hwSay: (l: string) => `قول ٥ جمل عن يومك فيها ${l}، وسجّل صوتك واسمعه.`,
    hwShadow: "Shadowing: اسمع جملة من شريكك واعيدها بصوت عالي ٣ مرات بنفس السرعة.",
    hwQuestions: "حضّر ٣ أسئلة تسألها لشريكك في الجلسة الجاية.",
    hwTitleGrammar: "تمرين قواعد",
    hwTitleShadow: "تمرين نطق",
    hwTitleQuestions: "خُد المبادرة",
    stay: "خليك في نفس المستوى شوية كمان لحد ما الأخطاء الأساسية تقل.",
    up: "أداءك ثابت ومريح في المستوى ده — جرّب المستوى اللي بعده.",
    down: "واضح إن المستوى ده صعب شوية دلوقتي؛ جرّب المستوى الأسهل كام جلسة.",
    notes: { grammar: "مبني على الأخطاء اللي ظهرت.", vocabulary: "مبني على تنوّع الكلمات.", fluency: "مبني على طول ردودك.", pronunciation: "تقدير تقريبي من ثقة التعرف على الكلام.", complexity: "مقارنةً بالمتوقع في المستوى.", confidence: "هل سألت وبادرت؟" },
  },
  en: {
    first: "This is your first session — nothing to compare yet. Next time I'll compare with this one.",
    since: (prev: string) => `Compared with your last session (${prev}):`,
    trendFew: "Not enough sessions yet to see a clear trend.",
    trend: (d: number) => (d >= 0 ? `Your average score over the last sessions is up by about ${d} points. Keep going!` : `Your average dropped by about ${-d} points — normal; focus on one thing at a time.`),
    impression: (w: number, t: number) => `You spoke ${t} times and said about ${w} words. ${w > 60 ? "Great effort!" : "Next time try to say slightly longer sentences."}`,
    disclaimer: "These pronunciation notes are indicative only, based on the speech-recognition transcript and confidence — not a certified assessment.",
    lowConf: "The recogniser was unsure about this word — possibly a pronunciation issue.",
    strengthTalk: "You stayed in German the whole time",
    strengthQuestion: "You asked a question and took part actively",
    strengthLong: "You produced a complete, longer sentence",
    hwSay: (l: string) => `Say 5 sentences about your day using ${l}; record yourself and listen back.`,
    hwShadow: "Shadowing: repeat one of your partner's sentences out loud 3 times at the same speed.",
    hwQuestions: "Prepare 3 questions to ask your partner next session.",
    hwTitleGrammar: "Grammar drill",
    hwTitleShadow: "Pronunciation drill",
    hwTitleQuestions: "Take the initiative",
    stay: "Stay at this level a bit longer until the basic mistakes become rare.",
    up: "You are stable and comfortable at this level — try the next one.",
    down: "This level seems hard right now; try the easier level for a few sessions.",
    notes: { grammar: "Based on the mistakes found.", vocabulary: "Based on word variety.", fluency: "Based on the length of your turns.", pronunciation: "Rough estimate from recognition confidence.", complexity: "Compared with what the level expects.", confidence: "Did you ask and lead?" },
  },
} as const;

const tx = (lang: Lang) => (lang === "ar" ? T.ar : T.en);

export function buildMockReport(ctx: ReportContext): LLMReport {
  const lang = ctx.language;
  const t = tx(lang);
  const learner = ctx.transcript.filter((x) => x.role === "learner");
  const sentences = learner.flatMap((x) => splitSentences(x.text).map((s) => ({ s, turn: x })));

  const mistakes: LLMReport["mistakes"] = [];
  const counts = new Map<string, { kind: WeaknessKind; count: number }>();
  const bump = (tag: string, kind: WeaknessKind) => counts.set(tag, { kind, count: (counts.get(tag)?.count ?? 0) + 1 });

  for (const { s } of sentences) {
    for (const d of DETECTORS) {
      const m = s.match(d.pattern);
      if (!m) continue;
      const corrected = d.fix(m, s);
      if (corrected === s) continue;
      mistakes.push({ said: s, corrected, explanation: d.explain[lang], tag: d.tag, severity: d.severity });
      bump(d.tag, "grammar");
    }
  }

  const words = learner.flatMap((x) => tokenizeWords(x.text));
  const totalWords = words.length;
  const unique = new Set(words.map((w) => w.toLowerCase()));
  const avgTurn = learner.length ? totalWords / learner.length : 0;
  const lowConf = learner.filter((x) => x.confidence !== null && x.confidence < 0.75);

  const notes: LLMReport["pronunciation"]["notes"] = [];
  for (const turn of lowConf.slice(0, 3)) {
    const word = tokenizeWords(turn.text).sort((a, b) => b.length - a.length)[0] ?? turn.text;
    const pit = PITFALLS.find((p) => p.test.test(word));
    notes.push({ word, tag: pit?.tag ?? "pron_vokallaenge", issue: t.lowConf, tip: pit ? pit.tip[lang] : "", indicator: "low_confidence" });
    bump(pit?.tag ?? "pron_vokallaenge", "pronunciation");
  }
  for (const pit of PITFALLS) {
    if (notes.length >= 4) break;
    if (notes.some((n) => n.tag === pit.tag)) continue;
    const w = words.find((x) => pit.test.test(x) && x.length > 3);
    if (w) notes.push({ word: w, tag: pit.tag, issue: pit.issue[lang], tip: pit.tip[lang], indicator: "typical_pitfall" });
  }

  if (avgTurn < 4 && learner.length > 1) bump("fluency_pausen", "fluency");

  // With sentence corrections available, count their fixes; correct sentences are the only ones to praise.
  const fixesCount = ctx.corrections ? ctx.corrections.reduce((n, c) => n + c.fixes.length, 0) : mistakes.length;
  const correctSentences = ctx.corrections ? new Set(ctx.corrections.filter((c) => c.isCorrect).map((c) => c.original)) : null;
  const grammarScore = Math.max(25, 88 - fixesCount * 9);
  const scores = {
    grammar: grammarScore,
    vocabulary: Math.min(92, 40 + unique.size),
    fluency: Math.min(90, Math.round(35 + avgTurn * 4)),
    pronunciation: Math.max(40, 82 - lowConf.length * 8),
    complexity: Math.min(88, Math.round(35 + avgTurn * 3)),
    confidence: Math.min(90, 45 + learner.filter((x) => x.text.includes("?")).length * 12 + Math.min(20, learner.length * 2)),
  };

  // ---- since last time ----
  const prev = ctx.previous[ctx.previous.length - 1];
  const prevTags = new Map(prev?.mistakeTags.map((m) => [m.tag, m.count]) ?? []);
  const improved: string[] = [];
  const regressed: string[] = [];
  const newIssues: string[] = [];
  const unresolved: string[] = [];
  for (const [tag, n] of prevTags) {
    const now = counts.get(tag)?.count ?? 0;
    if (now === 0 || now <= n * 0.6) improved.push(tagLabel(tag, lang));
    else unresolved.push(tagLabel(tag, lang));
  }
  const resolvedBefore = new Set(ctx.tracker.filter((x) => x.status === "resolved").map((x) => x.tag));
  for (const [tag] of counts) {
    if (prevTags.has(tag)) continue;
    if (resolvedBefore.has(tag)) regressed.push(tagLabel(tag, lang));
    else newIssues.push(tagLabel(tag, lang));
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const prevAvg = avg(ctx.previous.map((p) => p.overall));
  const nowAvg = avg(Object.values(scores));

  const sinceSummary = prev
    ? `${t.since(prev.date.slice(0, 10))} ${improved.length ? `✅ ${improved.join("، ")}` : ""} ${newIssues.length ? `🆕 ${newIssues.join("، ")}` : ""} ${unresolved.length ? `⏳ ${unresolved.join("، ")}` : ""}`.trim()
    : t.first;

  const focus = [...counts.entries()].filter(([, v]) => v.kind === "grammar").sort((a, b) => b[1].count - a[1].count)[0]?.[0] ?? null;

  const strengths: LLMReport["strengths"] = [];
  const praisable = correctSentences ? sentences.filter((x) => correctSentences.has(x.turn.text.trim())) : sentences;
  const longest = [...praisable].sort((a, b) => countWords(b.s) - countWords(a.s))[0];
  if (longest && countWords(longest.s) >= 5) strengths.push({ point: t.strengthLong, example: longest.s });
  const q = praisable.find((x) => x.s.endsWith("?"));
  if (q) strengths.push({ point: t.strengthQuestion, example: q.s });
  if (praisable.length && !learner.some((x) => /[؀-ۿ]/.test(x.text))) strengths.push({ point: t.strengthTalk, example: praisable[0].s });

  const homework: LLMReport["homework"] = [];
  if (focus) homework.push({ title: t.hwTitleGrammar, description: t.hwSay(tagLabel(focus, lang)) });
  homework.push({ title: t.hwTitleShadow, description: t.hwShadow });
  homework.push({ title: t.hwTitleQuestions, description: t.hwQuestions });

  const overallNow = nowAvg;
  const verdict: LLMReport["levelRecommendation"]["verdict"] =
    learner.length >= 6 && overallNow >= 80 ? "move_up" : learner.length >= 6 && overallNow < 40 ? "move_down" : "stay";

  return {
    sinceLastTime: {
      summary: sinceSummary,
      improved,
      regressed,
      newIssues,
      unresolved,
      lastFiveTrend: ctx.previous.length >= 2 ? t.trend(Math.round(nowAvg - prevAvg)) : t.trendFew,
    },
    overallImpression: t.impression(totalWords, learner.length),
    scores,
    scoreNotes: { ...t.notes },
    strengths,
    mistakes,
    pronunciation: { disclaimer: t.disclaimer, notes },
    vocabulary: {
      goodWords: [...unique].filter((w) => w.length >= 6).slice(0, 8),
      struggledWith: lowConf.map((x) => tokenizeWords(x.text)[0]).filter(Boolean).slice(0, 5),
      learnNext: LEARN_NEXT[ctx.level].map((x) => ({ de: x[0], meaning: lang === "ar" ? x[1] : x[2], example: x[3] })),
    },
    homework,
    levelRecommendation: { verdict, reasoning: verdict === "move_up" ? t.up : verdict === "move_down" ? t.down : t.stay },
    correctedSentences: mistakes.map((m) => ({ original: m.said, corrected: m.corrected })),
    weaknessCounts: [...counts.entries()].map(([tag, v]) => ({ tag, kind: v.kind, count: v.count })),
    nextFocus: focus,
  };
}

const LEARN_NEXT: Record<string, [string, string, string, string][]> = {
  A1: [
    ["Wie bitte?", "نعم؟ / ممكن تعيد؟", "Sorry?", "Wie bitte? Noch einmal, bitte."],
    ["Ich arbeite als …", "أنا بشتغل كـ …", "I work as …", "Ich arbeite als Ingenieur."],
    ["Feierabend", "خلصت الشغل", "end of the workday", "Um fünf Uhr habe ich Feierabend."],
    ["Termin", "ميعاد", "appointment", "Ich habe morgen einen Termin."],
    ["gern", "بحب (أعمل حاجة)", "gladly / like to", "Ich koche gern."],
  ],
  A2: [
    ["Das klingt gut!", "ده حلو!", "Sounds good!", "Das klingt gut! Ich komme mit."],
    ["einen Termin vereinbaren", "يحجز ميعاد", "to make an appointment", "Ich möchte einen Termin vereinbaren."],
    ["sich kümmern um", "يهتم بـ", "to take care of", "Ich kümmere mich um den Kunden."],
    ["Bescheid sagen", "يبلّغ", "to let someone know", "Sag mir bitte Bescheid."],
    ["Es kommt darauf an.", "حسب الظروف", "It depends.", "Es kommt darauf an, wann ich Zeit habe."],
  ],
  B1: [
    ["Meiner Meinung nach …", "في رأيي …", "In my opinion …", "Meiner Meinung nach ist das sinnvoll."],
    ["eine Lösung finden", "يلاقي حل", "to find a solution", "Wir finden bestimmt eine Lösung."],
    ["Rücksprache halten", "يرجع لحد / يتشاور", "to consult", "Ich halte kurz Rücksprache mit meinem Chef."],
    ["die Frist", "الميعاد النهائي", "deadline", "Die Frist endet am Freitag."],
    ["zuständig sein für", "مسؤول عن", "to be responsible for", "Ich bin für die Kunden zuständig."],
  ],
  B2: [
    ["Ich gebe zu bedenken, dass …", "أحب ألفت النظر إن …", "I'd point out that …", "Ich gebe zu bedenken, dass die Kosten steigen."],
    ["auf den Punkt bringen", "يلخّص الفكرة", "to get to the point", "Lassen Sie mich das auf den Punkt bringen."],
    ["einen Kompromiss eingehen", "يوصل لحل وسط", "to compromise", "Wir sollten einen Kompromiss eingehen."],
    ["die Rahmenbedingungen", "الظروف/الإطار العام", "the framework conditions", "Die Rahmenbedingungen haben sich geändert."],
    ["unter Druck stehen", "يكون تحت ضغط", "to be under pressure", "Das Team steht momentan unter Druck."],
  ],
};
