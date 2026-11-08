import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Demo Studio tables. Every table is prefixed with demo_ so they can live in the same Turso
 * database as other projects without touching their tables.
 */
export const demos = sqliteTable("demo_demos", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  status: text("status").notNull().default("draft"),
  niche: text("niche").notNull(),
  style: text("style").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  note: text("note").notNull().default(""),
  source: text("source").notNull().default("studio"),
  archived: integer("archived").notNull().default(0),
  isSample: integer("is_sample").notNull().default(0),
  siteLive: integer("site_live").notNull().default(0),
  webhookUrl: text("webhook_url").notNull().default(""),
  expiresAt: integer("expires_at").notNull(),
  publishedAt: integer("published_at"),
  firstOpenedAt: integer("first_opened_at"),
  lastOpenedAt: integer("last_opened_at"),
  views: integer("views").notNull().default(0),
  ctaClicks: integer("cta_clicks").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [uniqueIndex("demo_demos_slug").on(t.slug)]);

export const visits = sqliteTable("demo_visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  demoId: text("demo_id").notNull(),
  visitor: text("visitor").notNull(),
  day: text("day").notNull(),
  device: text("device").notNull(),
  startedAt: integer("started_at").notNull(),
  lastAt: integer("last_at").notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  maxScroll: integer("max_scroll").notNull().default(0),
  sections: text("sections").notNull().default("[]"),
}, (t) => [uniqueIndex("demo_visits_unique").on(t.demoId, t.visitor, t.day)]);

export const events = sqliteTable("demo_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  demoId: text("demo_id").notNull(),
  visitId: integer("visit_id"),
  type: text("type").notNull(),
  label: text("label").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export const alerts = sqliteTable("demo_alerts", {
  demoId: text("demo_id").notNull(),
  kind: text("kind").notNull(),
  sentAt: integer("sent_at").notNull(),
}, (t) => [primaryKey({ columns: [t.demoId, t.kind] })]);

export const settings = sqliteTable("demo_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const submissions = sqliteTable("demo_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  demoId: text("demo_id").notNull(),
  data: text("data").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const rates = sqliteTable("demo_rate", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});

/** Created on first use (idempotent, additive only). */
export const DDL = [
  "CREATE TABLE IF NOT EXISTS demo_demos (id TEXT PRIMARY KEY, slug TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', niche TEXT NOT NULL, style TEXT NOT NULL, name TEXT NOT NULL, content TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'studio', archived INTEGER NOT NULL DEFAULT 0, is_sample INTEGER NOT NULL DEFAULT 0, site_live INTEGER NOT NULL DEFAULT 0, webhook_url TEXT NOT NULL DEFAULT '', expires_at INTEGER NOT NULL, published_at INTEGER, first_opened_at INTEGER, last_opened_at INTEGER, views INTEGER NOT NULL DEFAULT 0, cta_clicks INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE UNIQUE INDEX IF NOT EXISTS demo_demos_slug ON demo_demos(slug)",
  "CREATE TABLE IF NOT EXISTS demo_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, demo_id TEXT NOT NULL, visitor TEXT NOT NULL, day TEXT NOT NULL, device TEXT NOT NULL, started_at INTEGER NOT NULL, last_at INTEGER NOT NULL, duration_ms INTEGER NOT NULL DEFAULT 0, max_scroll INTEGER NOT NULL DEFAULT 0, sections TEXT NOT NULL DEFAULT '[]')",
  "CREATE UNIQUE INDEX IF NOT EXISTS demo_visits_unique ON demo_visits(demo_id, visitor, day)",
  "CREATE TABLE IF NOT EXISTS demo_events (id INTEGER PRIMARY KEY AUTOINCREMENT, demo_id TEXT NOT NULL, visit_id INTEGER, type TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS demo_events_demo ON demo_events(demo_id, created_at)",
  "CREATE TABLE IF NOT EXISTS demo_alerts (demo_id TEXT NOT NULL, kind TEXT NOT NULL, sent_at INTEGER NOT NULL, PRIMARY KEY (demo_id, kind))",
  "CREATE TABLE IF NOT EXISTS demo_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS demo_submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, demo_id TEXT NOT NULL, data TEXT NOT NULL, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS demo_rate (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)",
].join(";\n");

export type DemoRow = typeof demos.$inferSelect;
export type VisitRow = typeof visits.$inferSelect;
export type EventRow = typeof events.$inferSelect;
