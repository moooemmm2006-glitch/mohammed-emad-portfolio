// Test helpers: past in-site conversations (they can no longer be created by the app, only read).
import { randomUUID } from "crypto";
import { getDb, schema } from "@/lib/db";
import { ScoreKeys } from "@/lib/report/schema";
import type { Level } from "@/lib/levels";

/** Store a finished conversation from before v11, with two turns and (optionally) its report. */
export async function insertPastSession(userId: string, o: { level?: Level; at?: number; report?: boolean; topic?: string | null } = {}) {
  const db = await getDb();
  const id = randomUUID();
  const at = o.at ?? Date.now();
  const level = o.level ?? "A1";
  await db.insert(schema.users).values({ id: userId, createdAt: at }).onConflictDoNothing().run();
  await db
    .insert(schema.sessions)
    .values({ id, userId, level, topic: o.topic ?? null, status: "reported", startedAt: at, endedAt: at + 300_000, lastActiveAt: at + 300_000, summaryUpto: 0 })
    .run();
  await db.insert(schema.turns).values([
    { sessionId: id, role: "partner", text: "Hallo! Wie heißt du?", createdAt: at },
    { sessionId: id, role: "user", text: "Ich heiße Sami.", createdAt: at + 1000, confidence: 0.9 },
  ]).run();
  if (o.report !== false) {
    const report = {
      session: { sessionId: id, date: new Date(at).toISOString(), level, durationSec: 300, userTurns: 1, userWords: 3, topic: o.topic ?? null },
      language: "ar",
      overall: 70,
      scores: Object.fromEntries(ScoreKeys.map((k) => [k, 70])),
      weaknessCounts: [{ tag: "artikel", kind: "grammar", count: 1 }],
    };
    await db.insert(schema.reports).values({ sessionId: id, userId, createdAt: at, language: "ar", overall: 70, json: JSON.stringify(report) }).run();
  }
  return id;
}
