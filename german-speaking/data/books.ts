import type { Level } from "../src/lib/levels";

export interface ReaderBook {
  level: Level;
  title: string;
  author: string;
  series: string;
  publisher: "Hueber";
  buyUrl: string;
  borrowUrl: string;
  totalPages: number | null;
  description: Record<"ar" | "de" | "en", string>;
}

const borrowUrl = "https://www.goethe.de/ins/eg/de/spr/ueb/ltd.html";

export const books: Record<Level, ReaderBook> = {
  A1: {
    level: "A1", title: "Franz, München", author: "Thomas Silvin",
    series: "Hueber Lese-Novelas, Niveaustufe A1", publisher: "Hueber",
    buyUrl: "https://www.medimops.de/thomas-silvin-hueber-lese-novelas-niveaustufe-a1-franz-muenchen-deutsch-als-fremdsprache-leseheft-taschenbuch-M03194010220.html",
    borrowUrl, totalPages: null,
    description: { ar: "بداية مناسبة للتعوّد على قراءة الألماني خطوة بخطوة.", de: "Ein ruhiger Einstieg, um Schritt für Schritt auf Deutsch zu lesen.", en: "A gentle starting point for building a German reading habit." },
  },
  A2: {
    level: "A2", title: "Carsten Tsara blickt nicht durch", author: "Franz Specht",
    series: "Hueber, Carsten Tsara series (A2)", publisher: "Hueber",
    buyUrl: "https://www.goethe.de/ins/eg/de/spr/ueb/ltd.html", borrowUrl, totalPages: null,
    description: { ar: "قراءة قصيرة تساعدك على متابعة الفكرة وفهم تفاصيلها.", de: "Eine kurze Lektüre zum Verstehen der Handlung und wichtiger Details.", en: "A short reader for following the main idea and its details." },
  },
  B1: {
    level: "B1", title: "Die ganze Wahrheit (Carsten Tsara hat Besuch)", author: "Franz Specht",
    series: "Hueber Lesehefte DaF, Niveau B1", publisher: "Hueber",
    buyUrl: "https://shop.hueber.de/de/sprache-lernen/deutsch-als-fremdsprache-daf-daz/lekture/lesehefte-daf-die-ganze-wahrheit-978-3-19-201669-1.html",
    borrowUrl, totalPages: 58,
    description: { ar: "تدريب على قراءة نص أطول وملاحظة المفردات في سياقها.", de: "Übung für einen längeren Text und für Wortschatz im Zusammenhang.", en: "Practice with a longer text and vocabulary in context." },
  },
  B2: {
    level: "B2", title: "Der Ruf der Tagesfische und andere Geschichten", author: "Leonhard Thoma",
    series: "Hueber Lesehefte DaF, Niveau B2", publisher: "Hueber",
    buyUrl: "https://shop.hueber.de/en/reihen-und-lehrwerke/lesehefte-deutsch-als-fremdsprache/niveaustufe-b2.html",
    borrowUrl, totalPages: null,
    description: { ar: "مجموعة قصص للتدرّب على قراءة ألماني أكثر تنوعًا.", de: "Geschichten für abwechslungsreiches Lesen auf Deutsch.", en: "A collection of stories for varied German reading practice." },
  },
};
