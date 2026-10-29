import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { films as filmFile, type FilmSeed } from "../../data/films";
import { getDb, schema } from "./db";
import type { FilmItem } from "./filmsShared";

export interface FilmCatalogItem extends FilmItem {
  copy?: FilmSeed["copy"];
  added?: boolean;
}

const fromSeed = (film: FilmSeed): FilmCatalogItem => ({
  id: film.id,
  title: film.title,
  year: film.year,
  genre: film.copy.ar.genre,
  summary: film.copy.ar.summary,
  usefulness: film.copy.ar.usefulness,
  copy: film.copy,
  ...(film.youtubeId ? { youtubeId: film.youtubeId } : {}),
  ...(film.channel ? { channel: film.channel } : {}),
  ...(film.sourceUrl ? { sourceUrl: film.sourceUrl } : {}),
  ...(film.channelUrl ? { channelUrl: film.channelUrl } : {}),
});

function fromJson(id: string, data: string): FilmCatalogItem | null {
  try {
    const value = JSON.parse(data) as Omit<FilmItem, "id">;
    if (typeof value.title !== "string" || typeof value.summary !== "string" || !Number.isInteger(value.year)) return null;
    return { id, ...value, added: true };
  } catch {
    return null;
  }
}

/** File recommendations merged with admin changes. */
export async function listFilms(): Promise<FilmCatalogItem[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.filmItems).all();
  const hidden = new Set(rows.filter((r) => r.action === "hide").map((r) => r.id));
  const additions = rows
    .filter((r) => r.action === "add")
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => fromJson(r.id, r.data))
    .filter((x): x is FilmCatalogItem => !!x);
  return [...filmFile.filter((f) => !hidden.has(f.id)).map(fromSeed), ...additions];
}

export async function addFilm(film: Omit<FilmItem, "id">, now = Date.now()): Promise<FilmCatalogItem> {
  const db = await getDb();
  const id = `admin-${randomUUID()}`;
  await db.insert(schema.filmItems).values({ id, action: "add", data: JSON.stringify(film), createdAt: now }).run();
  return { id, ...film, added: true };
}

export async function removeFilm(id: string, now = Date.now()): Promise<boolean> {
  const db = await getDb();
  if (filmFile.some((f) => f.id === id)) {
    await db.insert(schema.filmItems).values({ id, action: "hide", data: "{}", createdAt: now })
      .onConflictDoUpdate({ target: schema.filmItems.id, set: { action: "hide", data: "{}", createdAt: now } }).run();
    return true;
  }
  const result = await db.delete(schema.filmItems).where(eq(schema.filmItems.id, id)).run();
  return Number(result.rowsAffected ?? 0) > 0;
}
