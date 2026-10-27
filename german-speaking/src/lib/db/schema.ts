import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Single local learner by default ("local"), but every row carries user_id so auth can be added later.

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  createdAt: integer("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  userId: text("user_id").primaryKey(),
  json: text("json").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  level: text("level").notNull(),
  topic: text("topic"),
  status: text("status").notNull(), // active | ended | reported
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at"),
  lastActiveAt: integer("last_active_at").notNull(),
  summary: text("summary"),
  summaryUpto: integer("summary_upto").notNull().default(0),
  focusTag: text("focus_tag"),
  pendingFeedback: text("pending_feedback"),
});

export const turns = sqliteTable("turns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // user | partner
  text: text("text").notNull(),
  createdAt: integer("created_at").notNull(),
  confidence: real("confidence"),
  meta: text("meta"), // JSON: alternatives, input mode, fallback, violations, hint
});

export const reports = sqliteTable("reports", {
  sessionId: text("session_id").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at").notNull(),
  language: text("language").notNull(),
  overall: integer("overall").notNull(),
  json: text("json").notNull(),
});

export const weaknesses = sqliteTable(
  "weaknesses",
  {
    userId: text("user_id").notNull(),
    tag: text("tag").notNull(),
    kind: text("kind").notNull(),
    firstSeen: text("first_seen").notNull(),
    lastSeen: text("last_seen").notNull(),
    status: text("status").notNull(),
    totalCount: integer("total_count").notNull(),
    absentStreak: integer("absent_streak").notNull(),
    history: text("history").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tag] })],
);

export const violationLog = sqliteTable("violation_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  level: text("level").notNull(),
  attempt: integer("attempt").notNull(),
  violations: text("violations").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const DDL = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings (user_id TEXT PRIMARY KEY, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, level TEXT NOT NULL, topic TEXT, status TEXT NOT NULL,
  started_at INTEGER NOT NULL, ended_at INTEGER, last_active_at INTEGER NOT NULL,
  summary TEXT, summary_upto INTEGER NOT NULL DEFAULT 0, focus_tag TEXT, pending_feedback TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user_started ON sessions(user_id, started_at);
CREATE TABLE IF NOT EXISTS turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL,
  created_at INTEGER NOT NULL, confidence REAL, meta TEXT
);
CREATE INDEX IF NOT EXISTS turns_session ON turns(session_id, id);
CREATE TABLE IF NOT EXISTS reports (
  session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, language TEXT NOT NULL,
  overall INTEGER NOT NULL, json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS weaknesses (
  user_id TEXT NOT NULL, tag TEXT NOT NULL, kind TEXT NOT NULL, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
  status TEXT NOT NULL, total_count INTEGER NOT NULL, absent_streak INTEGER NOT NULL, history TEXT NOT NULL,
  PRIMARY KEY (user_id, tag)
);
CREATE TABLE IF NOT EXISTS violation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, level TEXT NOT NULL, attempt INTEGER NOT NULL,
  violations TEXT NOT NULL, created_at INTEGER NOT NULL
);
`;
