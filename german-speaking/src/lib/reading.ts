import { randomUUID } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { books } from "../../data/books";
import { getDb, schema } from "./db";
import type { ReadingLevel } from "./readingShared";
import { readingStreak, readingWeek } from "./readingShared";

export interface ReadingNoteInput {
  word: string;
  meaning: string;
  sentence: string;
  page: number | null;
}

export async function ensureReadingBook(userId: string, level: ReadingLevel) {
  const db = await getDb();
  await db.insert(schema.readingBooks).values({
    userId, level, currentPage: 0, totalPages: books[level].totalPages, updatedAt: Date.now(),
  }).onConflictDoNothing().run();
  return db.select().from(schema.readingBooks).where(and(
    eq(schema.readingBooks.userId, userId), eq(schema.readingBooks.level, level),
  )).get();
}

export async function getReadingState(userId: string, level: ReadingLevel, today: string) {
  const db = await getDb();
  const book = await ensureReadingBook(userId, level);
  if (!book) throw new Error("reading_book_missing");
  const [stepRow, dayRows] = await Promise.all([
    db.select().from(schema.readingStepDays).where(and(
      eq(schema.readingStepDays.userId, userId), eq(schema.readingStepDays.level, level),
      eq(schema.readingStepDays.day, today),
    )).get(),
    db.select({ day: schema.readingDays.day }).from(schema.readingDays).where(and(
      eq(schema.readingDays.userId, userId), eq(schema.readingDays.level, level),
    )).orderBy(desc(schema.readingDays.day)).all(),
  ]);
  let steps = [false, false, false];
  try {
    const parsed = JSON.parse(stepRow?.steps ?? "[]");
    if (Array.isArray(parsed)) steps = [0, 1, 2].map((i) => parsed[i] === true);
  } catch { /* use an empty checklist for today */ }
  const days = dayRows.map((row) => row.day);
  return {
    book: { currentPage: book.currentPage, totalPages: book.totalPages },
    steps,
    hasReadToday: days.includes(today),
    streak: readingStreak(days, today),
    week: readingWeek(days, today),
    days,
  };
}

export async function saveReadingBook(userId: string, level: ReadingLevel, currentPage: number, totalPages: number | null) {
  const db = await getDb();
  await ensureReadingBook(userId, level);
  await db.update(schema.readingBooks).set({ currentPage, totalPages, updatedAt: Date.now() }).where(and(
    eq(schema.readingBooks.userId, userId), eq(schema.readingBooks.level, level),
  )).run();
}

export async function saveReadingSteps(userId: string, level: ReadingLevel, day: string, steps: boolean[]) {
  const db = await getDb();
  await db.insert(schema.readingStepDays).values({
    userId, level, day, steps: JSON.stringify(steps), updatedAt: Date.now(),
  }).onConflictDoUpdate({
    target: [schema.readingStepDays.userId, schema.readingStepDays.level, schema.readingStepDays.day],
    set: { steps: JSON.stringify(steps), updatedAt: Date.now() },
  }).run();
}

export async function completeReadingPage(userId: string, level: ReadingLevel, day: string) {
  const db = await getDb();
  const book = await ensureReadingBook(userId, level);
  if (!book) throw new Error("reading_book_missing");
  const inserted = await db.insert(schema.readingDays).values({ userId, level, day, completedAt: Date.now() })
    .onConflictDoNothing().run();
  if (Number(inserted.rowsAffected ?? 0) === 0) return { alreadyDone: true };
  await db.update(schema.readingBooks).set({
    currentPage: sql.raw("CASE WHEN total_pages IS NOT NULL AND current_page >= total_pages THEN current_page ELSE current_page + 1 END"),
    updatedAt: Date.now(),
  }).where(and(eq(schema.readingBooks.userId, userId), eq(schema.readingBooks.level, level))).run();
  return { alreadyDone: false };
}

export async function listReadingNotes(userId: string, level: ReadingLevel) {
  const db = await getDb();
  return db.select().from(schema.readingNotes).where(and(
    eq(schema.readingNotes.userId, userId), eq(schema.readingNotes.level, level),
  )).orderBy(desc(schema.readingNotes.createdAt)).all();
}

export async function addReadingNote(userId: string, level: ReadingLevel, note: ReadingNoteInput, now = Date.now()) {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(schema.readingNotes).values({
    id, userId, level, word: note.word.trim(), meaning: note.meaning.trim(),
    sentence: note.sentence.trim(), page: note.page, createdAt: now, updatedAt: now,
  }).run();
  return (await db.select().from(schema.readingNotes).where(eq(schema.readingNotes.id, id)).get())!;
}

export async function updateReadingNote(userId: string, level: ReadingLevel, id: string, note: ReadingNoteInput, now = Date.now()) {
  const db = await getDb();
  const result = await db.update(schema.readingNotes).set({
    word: note.word.trim(), meaning: note.meaning.trim(), sentence: note.sentence.trim(),
    page: note.page, updatedAt: now,
  }).where(and(eq(schema.readingNotes.id, id), eq(schema.readingNotes.userId, userId), eq(schema.readingNotes.level, level))).run();
  return Number(result.rowsAffected ?? 0) > 0;
}

export async function deleteReadingNote(userId: string, level: ReadingLevel, id: string) {
  const db = await getDb();
  const result = await db.delete(schema.readingNotes).where(and(
    eq(schema.readingNotes.id, id), eq(schema.readingNotes.userId, userId), eq(schema.readingNotes.level, level),
  )).run();
  return Number(result.rowsAffected ?? 0) > 0;
}
