export interface FilmCopy {
  ar: { genre: string; summary: string; usefulness: string };
  de: { genre: string; summary: string; usefulness: string };
  en: { genre: string; summary: string; usefulness: string };
}

export interface FilmSeed {
  id: string;
  title: string;
  year: number | null;
  copy: FilmCopy;
  youtubeId?: string;
  channel?: string;
  sourceUrl?: string;
  channelUrl?: string;
}

export const GOETHE_CHANNEL_URL = "https://www.youtube.com/@goetheinstitut";
export const GOETHE_SEARCH_URL = "https://www.youtube.com/results?search_query=Typisch!%3F+Goethe-Institut";

export const films: FilmSeed[] = [
  {
    id: "typisch-episode-1",
    title: "Typisch!? Episode 1: Das Vorstellungsgespräch",
    year: null,
    copy: {
      ar: {
        genre: "سلسلة فيديو قصيرة عن الحياة العملية",
        summary: "متدرّبة إسبانية تبدأ العمل في شركة ألمانية، وتحاول فهم أجواء المكان وطريقة التعامل في مقابلة العمل.",
        usefulness: "مفيد لمفردات الشغل والتعارف ومقابلات العمل.",
      },
      de: {
        genre: "Kurze Videoserie über den Arbeitsalltag",
        summary: "Eine spanische Praktikantin beginnt in einem deutschen Unternehmen und erlebt den Arbeitsalltag und ein Vorstellungsgespräch.",
        usefulness: "Gut für Wortschatz zu Arbeit, Kennenlernen und Bewerbungsgesprächen.",
      },
      en: {
        genre: "Short video series about working life",
        summary: "A Spanish trainee starts at a German company and experiences workplace culture and a job interview.",
        usefulness: "Useful work, introduction, and interview vocabulary.",
      },
    },
    youtubeId: "X-J1t8q0wxM",
    channel: "Goethe-Institut",
    sourceUrl: "https://www.youtube.com/watch?v=X-J1t8q0wxM",
    channelUrl: GOETHE_CHANNEL_URL,
  },
  {
    id: "almanya-willkommen-in-deutschland",
    title: "Almanya – Willkommen in Deutschland",
    year: 2011,
    copy: {
      ar: {
        genre: "كوميديا ودراما عائلية",
        summary: "حكاية عائلة تركية تعيش في ألمانيا، بين تجارب الأجيال المختلفة وأسئلة الانتماء والحياة اليومية.",
        usefulness: "يساعدك تسمع حوارات عائلية ولهجات ومفردات عن الهوية والحياة في ألمانيا.",
      },
      de: {
        genre: "Familienkomödie und Drama",
        summary: "Eine türkische Familie in Deutschland erlebt verschiedene Perspektiven der Generationen und Fragen von Zugehörigkeit und Alltag.",
        usefulness: "Gut für familiäre Dialoge und Wortschatz zu Identität und Leben in Deutschland.",
      },
      en: {
        genre: "Family comedy-drama",
        summary: "A Turkish family in Germany navigates different generations, belonging, and everyday life.",
        usefulness: "Good for family dialogue and vocabulary about identity and life in Germany.",
      },
    },
  },
  {
    id: "good-bye-lenin",
    title: "Good Bye, Lenin!",
    year: 2003,
    copy: {
      ar: {
        genre: "كوميديا درامية",
        summary: "بعد تغيّرات سياسية كبيرة في ألمانيا، يحاول شاب حماية والدته من الصدمة، فتبدأ مواقف مرتبطة بالحياة في الشرق والغرب.",
        usefulness: "مفيد لسماع كلام يومي والتعرّف على مفردات التاريخ والتحوّلات الاجتماعية.",
      },
      de: {
        genre: "Tragikomödie",
        summary: "Nach großen politischen Veränderungen versucht ein Sohn, seine Mutter vor einem Schock zu bewahren. Dabei entstehen Situationen rund um Ost und West.",
        usefulness: "Gut für Alltagssprache und Wortschatz zu Geschichte und gesellschaftlichem Wandel.",
      },
      en: {
        genre: "Tragicomedy",
        summary: "After major political changes, a son tries to protect his mother from a shock, leading to situations shaped by life in East and West.",
        usefulness: "Useful for everyday speech and vocabulary about history and social change.",
      },
    },
  },
  {
    id: "fack-ju-gohte",
    title: "Fack ju Göhte",
    year: 2013,
    copy: {
      ar: {
        genre: "كوميديا مدرسية",
        summary: "رجل يجد نفسه يعمل في مدرسة، ويتعامل مع فصل مليء بالمواقف والفوضى، في إطار كوميدي.",
        usefulness: "فيه كلام عامي كتير؛ اربطه بموضوع 91: Umgangssprache.",
      },
      de: {
        genre: "Schulkomödie",
        summary: "Ein Mann landet als Lehrer an einer Schule und muss mit einer chaotischen Klasse und vielen Situationen umgehen.",
        usefulness: "Enthält viel Umgangssprache; passt zu Thema 91: Umgangssprache.",
      },
      en: {
        genre: "School comedy",
        summary: "A man ends up teaching at a school and has to handle a chaotic class and its many situations.",
        usefulness: "Contains plenty of colloquial German; connect it with topic 91: Umgangssprache.",
      },
    },
  },
];
