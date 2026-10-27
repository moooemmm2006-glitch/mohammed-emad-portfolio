import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const g = globalThis as unknown as { __gsDb?: { path: string; db: DB; raw: Database.Database } };

export function getDb(): DB {
  const file = process.env.DATABASE_PATH || "./data/german-speaking.db";
  const resolved = file === ":memory:" ? file : path.resolve(process.cwd(), file);
  if (g.__gsDb?.path === resolved) return g.__gsDb.db;
  if (resolved !== ":memory:") fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const raw = new Database(resolved);
  raw.pragma("journal_mode = WAL");
  raw.pragma("foreign_keys = ON");
  raw.exec(schema.DDL);
  const db = drizzle(raw, { schema });
  g.__gsDb = { path: resolved, db, raw };
  return db;
}

/** Test helper: drop the cached connection so the next getDb() starts fresh. */
export function resetDbForTests() {
  g.__gsDb?.raw.close();
  delete g.__gsDb;
}

export { schema };
