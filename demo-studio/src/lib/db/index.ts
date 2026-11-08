import "server-only";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

export type DB = LibSQLDatabase<typeof schema>;

/** Turso in production; a local SQLite file in development (Vercel's disk is temporary). */
export function dbTarget(): { url: string; authToken?: string; kind: "remote" | "file" | "temporary" } {
  const remote = process.env.TURSO_DATABASE_URL;
  if (remote) return { url: remote, authToken: process.env.TURSO_AUTH_TOKEN, kind: "remote" };
  if (process.env.VERCEL) return { url: "file:/tmp/demo-studio.db", kind: "temporary" };
  const file = path.resolve(process.cwd(), process.env.DATABASE_PATH || "./data/demo-studio.db");
  return { url: `file:${file}`, kind: "file" };
}

type Handle = { url: string; db: DB; client: Client; ready: Promise<void> };
const g = globalThis as unknown as { __demoDb?: Handle; __demoSeed?: (db: DB) => Promise<void> };

function open(): Handle {
  const target = dbTarget();
  if (g.__demoDb?.url === target.url) return g.__demoDb;
  if (target.url.startsWith("file:")) fs.mkdirSync(path.dirname(target.url.slice(5)), { recursive: true });
  const client = createClient({ url: target.url, authToken: target.authToken });
  const db = drizzle(client, { schema });
  const ready = (async () => {
    if (target.url.startsWith("file:")) await client.execute("PRAGMA journal_mode = WAL").catch(() => {});
    await client.executeMultiple(schema.DDL);
    const { seedSamples } = await import("../seed");
    await seedSamples(db);
  })();
  ready.catch(() => {
    if (g.__demoDb?.ready === ready) delete g.__demoDb;
  });
  g.__demoDb = { url: target.url, db, client, ready };
  return g.__demoDb;
}

export async function getDb(): Promise<DB> {
  const h = open();
  await h.ready;
  return h.db;
}

export { schema };
