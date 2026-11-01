import type { Level } from "@/lib/levels";

// 🎯 Einstufungstest: 20 short questions, five per level (A1 → B2). The start level is the first level
// where fewer than 4 of 5 are right (all levels passed → B2, to polish it).

export interface PlacementQuestion {
  level: Level;
  /** The German sentence with ___ for the gap (or a short question). */
  de: string;
  options: string[];
  answer: number;
  /** Short explanation in Egyptian Arabic. */
  why: string;
}

export const PLACEMENT: PlacementQuestion[] = [
  { level: "A1", de: "Ich ___ Ahmed.", options: ["bin", "bist", "ist", "sind"], answer: 0, why: "مع ich بنقول bin: Ich bin Ahmed." },
  { level: "A1", de: "Wie ___ du?", options: ["heiße", "heißt", "heißen", "heiß"], answer: 1, why: "مع du الفعل بياخد ‎-st: du heißt." },
  { level: "A1", de: "Das ist ___ Tisch.", options: ["die", "das", "der", "den"], answer: 2, why: "Tisch مذكّر: der Tisch." },
  { level: "A1", de: "Ich wohne ___ Kairo.", options: ["in", "an", "auf", "zu"], answer: 0, why: "مع المدن بنقول in: in Kairo." },
  { level: "A1", de: "Was ist das Gegenteil von „groß“?", options: ["lang", "klein", "alt", "schnell"], answer: 1, why: "groß = كبير، وعكسها klein = صغير." },
  { level: "A2", de: "Gestern ___ ich ins Kino gegangen.", options: ["habe", "war", "bin", "hatte"], answer: 2, why: "gehen فعل حركة، فبياخد sein في الـ Perfekt: ich bin gegangen." },
  { level: "A2", de: "Ich gebe ___ Mann das Buch.", options: ["den", "dem", "der", "des"], answer: 1, why: "اللي بياخد الحاجة بيبقى Dativ: dem Mann." },
  { level: "A2", de: "Ich komme nicht, ___ ich krank bin.", options: ["weil", "denn", "aber", "und"], answer: 0, why: "weil بتودّي الفعل لآخر الجملة: … weil ich krank bin." },
  { level: "A2", de: "Mein Bruder ist ___ als ich.", options: ["alt", "am ältesten", "älter", "mehr alt"], answer: 2, why: "المقارنة: alt → älter als." },
  { level: "A2", de: "Kannst du mir bitte ___?", options: ["hilfst", "helfen", "geholfen", "hilft"], answer: 1, why: "بعد können الفعل التاني بيروح آخر الجملة في المصدر: helfen." },
  { level: "B1", de: "Das ist der Mann, ___ ich gestern geholfen habe.", options: ["den", "der", "dem", "dessen"], answer: 2, why: "helfen بياخد Dativ، فالضمير الموصول dem." },
  { level: "B1", de: "Wenn ich mehr Zeit ___, würde ich mehr reisen.", options: ["habe", "hätte", "hatte", "haben"], answer: 1, why: "الشرط غير الحقيقي (Konjunktiv II): wenn ich … hätte." },
  { level: "B1", de: "Das Haus ___ 1990 gebaut.", options: ["wurde", "hat", "wird gebaut", "ist"], answer: 0, why: "المبني للمجهول في الماضي: wurde + Partizip: wurde gebaut." },
  { level: "B1", de: "Ich freue mich ___ das Wochenende.", options: ["über", "auf", "für", "an"], answer: 1, why: "sich freuen auf = مستني حاجة جاية بفرحة." },
  { level: "B1", de: "___ des schlechten Wetters bleiben wir zu Hause.", options: ["Trotz", "Während", "Wegen", "Statt"], answer: 2, why: "wegen = بسبب (+ Genitiv)." },
  { level: "B2", de: "Er tut so, als ___ er alles wissen.", options: ["wird", "würde", "hat", "ist"], answer: 1, why: "als ob / als + Konjunktiv II: als würde er alles wissen." },
  { level: "B2", de: "Je mehr man übt, ___ besser spricht man.", options: ["als", "wie", "desto", "dann"], answer: 2, why: "je … desto = كل ما … كل ما." },
  { level: "B2", de: "Die Entscheidung ___ noch heute getroffen werden.", options: ["muss", "hat", "wird zu", "soll sein"], answer: 0, why: "Modalverb + Passiv Infinitiv: muss getroffen werden." },
  { level: "B2", de: "Er hat das Projekt erfolgreich ___ Ende gebracht.", options: ["am", "zu", "bis", "zum"], answer: 1, why: "التعبير الثابت: etwas zu Ende bringen." },
  { level: "B2", de: "Kaum ___ er angekommen, klingelte das Telefon.", options: ["hatte", "ist", "war", "wurde"], answer: 2, why: "ankommen بياخد sein، والـ Plusquamperfekt: war angekommen." },
];

export const PASS_PER_LEVEL = 4;

export function placementResult(answers: (number | null)[]): { level: Level; perLevel: Record<Level, number> } {
  const perLevel = { A1: 0, A2: 0, B1: 0, B2: 0 } as Record<Level, number>;
  PLACEMENT.forEach((q, i) => {
    if (answers[i] === q.answer) perLevel[q.level] += 1;
  });
  const order: Level[] = ["A1", "A2", "B1", "B2"];
  const level = order.find((l) => perLevel[l] < PASS_PER_LEVEL) ?? "B2";
  return { level, perLevel };
}
