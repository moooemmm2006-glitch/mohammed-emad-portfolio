import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

// libSQL: a plain SQLite file locally, or a hosted Turso database in production
// (Vercel's filesystem is temporary, so a file there would lose your history).
export type DB = LibSQLDatabase<typeof schema>;

export type StorageKind = "remote" | "file" | "temporary";

export function dbTarget(): { url: string; authToken?: string; kind: StorageKind } {
  const remote = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  if (remote) return { url: remote, authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN, kind: "remote" };
  if (process.env.VERCEL) return { url: "file:/tmp/german-speaking.db", kind: "temporary" };
  const file = path.resolve(process.cwd(), process.env.DATABASE_PATH || "./data/german-speaking.db");
  return { url: `file:${file}`, kind: "file" };
}

const g = globalThis as unknown as { __gsDb?: { url: string; db: DB; client: Client; ready: Promise<void> } };

function open() {
  const target = dbTarget();
  if (g.__gsDb?.url === target.url) return g.__gsDb;
  if (target.url.startsWith("file:")) fs.mkdirSync(path.dirname(target.url.slice(5)), { recursive: true });
  const client = createClient({ url: target.url, authToken: target.authToken });
  const ready = (async () => {
    if (target.url.startsWith("file:")) await client.execute("PRAGMA journal_mode = WAL").catch(() => {});
    await client.executeMultiple(schema.DDL);
    await addMissingColumns(client);
    await client.executeMultiple(schema.POST_DDL);
    await client.executeMultiple(schema.READING_DDL);
    await client.executeMultiple(schema.GRAMMAR_DDL);
    await client.executeMultiple(schema.COMMUNITY_DDL);
    await client.executeMultiple(schema.SPRACHCAFE_DDL);
    await client.executeMultiple(schema.LEVEL_REVIEWS_DDL);
    const now = Date.now();
    await client.execute({ sql: "INSERT OR IGNORE INTO cafe_teachers (id, display_name_ar, display_name_en, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", args: ["farah", "Frau Farah", "Frau Farah", now, now] });
    await client.execute({ sql: "INSERT OR IGNORE INTO cafe_teachers (id, display_name_ar, display_name_en, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", args: ["omar-helmy", "Herr Omar", "Herr Omar", now, now] });
    // The two first teachers are shown with their German titles; rename the old seed once (only if unchanged).
    await client.execute({ sql: "UPDATE cafe_teachers SET display_name_ar = ?, display_name_en = ? WHERE id = ? AND display_name_ar = ?", args: ["Frau Farah", "Frau Farah", "farah", "فرح"] });
    await client.execute({ sql: "UPDATE cafe_teachers SET display_name_ar = ?, display_name_en = ? WHERE id = ? AND display_name_ar = ?", args: ["Herr Omar", "Herr Omar", "omar-helmy", "عمر حلمي"] });
  })();
  // A failed migration must not be cached forever (e.g. a network blip on Turso).
  ready.catch(() => {
    if (g.__gsDb?.ready === ready) delete g.__gsDb;
  });
  g.__gsDb = { url: target.url, db: drizzle(client, { schema }), client, ready };
  return g.__gsDb;
}

/** Additive migration: works on local SQLite and Turso, and is safe to run on every cold start. */
async function addMissingColumns(client: Client) {
  const tables = [...new Set(schema.ADDED_COLUMNS.map((c) => c.table))];
  for (const table of tables) {
    const info = await client.execute(`PRAGMA table_info(${table})`);
    const have = new Set(info.rows.map((r) => String(r.name)));
    for (const c of schema.ADDED_COLUMNS) {
      if (c.table !== table || have.has(c.column)) continue;
      // Another instance may have added it a moment ago (parallel cold starts).
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${c.sql}`).catch((e) => {
        if (!/duplicate column/i.test(String(e))) throw e;
      });
    }
  }
}

/** The database, with tables created on first use. */
export async function getDb(): Promise<DB> {
  const h = open();
  await h.ready;
  return h.db;
}

/** Test helper: close the connection so the next getDb() opens a fresh database. */
export function resetDbForTests() {
  g.__gsDb?.client.close();
  delete g.__gsDb;
}

export { schema };
