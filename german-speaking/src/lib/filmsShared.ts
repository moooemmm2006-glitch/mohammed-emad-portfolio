import type { FilmCopy } from "../../data/films";

export interface FilmItem {
  id: string;
  title: string;
  year: number | null;
  genre?: string;
  summary: string;
  usefulness?: string;
  youtubeId?: string;
  channel?: string;
  sourceUrl?: string;
  channelUrl?: string;
  copy?: FilmCopy;
  added?: boolean;
}

export const filmProgressKey = (id: string) => `film:${id}`;
export const justWatchSearchUrl = (title: string) => `https://www.justwatch.com/eg/search?q=${encodeURIComponent(title)}`;

