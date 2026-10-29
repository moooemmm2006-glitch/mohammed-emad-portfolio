import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { books } from "../data/books";
import { resetDbForTests } from "@/lib/db";
import { completeReadingPage, getReadingState, saveReadingBook, saveReadingSteps } from "@/lib/reading";
import {
  isDayKey, readingFinishDate, readingProgressBonus, readingStreak, readingWeek, shiftDay,
} from "@/lib/readingShared";

describe("level reader and personal reading tracker", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-reading-"));
  let file = 0;

  beforeEach(() => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, "reading-" + file++ + ".db");
  });

  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("assigns the requested Hueber title and initial page count to each level", () => {
    expect(Object.values(books).map((book) => book.title)).toEqual([
      "Franz, München",
      "Carsten Tsara blickt nicht durch",
      "Die ganze Wahrheit (Carsten Tsara hat Besuch)",
      "Der Ruf der Tagesfische und andere Geschichten",
    ]);
    expect(Object.values(books).map((book) => book.totalPages)).toEqual([null, null, 58, null]);
    expect(Object.values(books).every((book) => book.publisher === "Hueber" && book.borrowUrl.includes("goethe.de"))).toBe(true);
  });

  it("validates day keys and calculates date shifts, finish date, and remaining streak", () => {
    expect(isDayKey("2026-02-28")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(readingFinishDate(58, 10, "2026-01-01")).toBe("2026-02-18");
    expect(readingFinishDate(null, 3, "2026-01-01")).toBeNull();
    expect(readingStreak(["2026-01-01", "2026-01-02", "2026-01-03"], "2026-01-03")).toBe(3);
    expect(readingStreak(["2026-01-01", "2026-01-02"], "2026-01-03")).toBe(2);
    expect(readingWeek(["2026-01-01", "2026-01-07"], "2026-01-07")).toEqual([true, false, false, false, false, false, true]);
  });

  it("keeps daily completion once per day and isolates pages and checklists per user", async () => {
    const first = await getReadingState("learner-one", "B1", "2026-06-15");
    expect(first.book).toEqual({ currentPage: 0, totalPages: 58 });
    await saveReadingSteps("learner-one", "B1", "2026-06-15", [true, false, true]);
    expect((await getReadingState("learner-one", "B1", "2026-06-15")).steps).toEqual([true, false, true]);
    expect((await getReadingState("learner-one", "B1", "2026-06-16")).steps).toEqual([false, false, false]);

    expect(await completeReadingPage("learner-one", "B1", "2026-06-15")).toEqual({ alreadyDone: false });
    expect(await completeReadingPage("learner-one", "B1", "2026-06-15")).toEqual({ alreadyDone: true });
    const after = await getReadingState("learner-one", "B1", "2026-06-15");
    expect(after.book.currentPage).toBe(1);
    expect(after.hasReadToday).toBe(true);
    expect(after.streak).toBe(1);
    expect((await getReadingState("learner-two", "B1", "2026-06-15")).book.currentPage).toBe(0);
  });

  it("saves each user's own page count and gives reading a share of Lesen progress", async () => {
    await saveReadingBook("learner-one", "A1", 4, 80);
    await saveReadingBook("learner-two", "A1", 0, 42);
    expect((await getReadingState("learner-one", "A1", "2026-06-15")).book).toEqual({ currentPage: 4, totalPages: 80 });
    expect((await getReadingState("learner-two", "A1", "2026-06-15")).book).toEqual({ currentPage: 0, totalPages: 42 });
    expect(readingProgressBonus(0, 58)).toBe(0);
    expect(readingProgressBonus(10, 58)).toBe(3);
    expect(readingProgressBonus(20, null)).toBe(20);
  });
});
