import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Every row carries user_id. Before accounts existed everything belonged to "local";
// the first account that signs up takes over that data (see migrate.ts).

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  createdAt: integer("created_at").notNull(),
  // Login: username/password now; email or Google can be added as more nullable columns later.
  username: text("username"),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("student"), // admin | student
  disabled: integer("disabled").notNull().default(0),
  /** Bumped on password change/reset/disable so old cookies stop working. */
  tokenVersion: integer("token_version").notNull().default(0),
  /** Public Blob URL or a small data: URL (256×256 WebP). */
  photo: text("photo"),
  dailyMinutes: integer("daily_minutes"),
  dailyReplies: integer("daily_replies"),
  lastActiveAt: integer("last_active_at"),
});

/** Failed logins, for rate limiting across serverless instances. */
export const loginAttempts = sqliteTable("login_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  at: integer("at").notNull(),
});

/** Speaking time and partner replies per user per day, for the admin's daily limits. */
export const usage = sqliteTable(
  "usage",
  {
    userId: text("user_id").notNull(),
    day: text("day").notNull(), // YYYY-MM-DD in USAGE_TZ
    replies: integer("replies").notNull().default(0),
    ms: integer("ms").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

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
CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS login_attempts_key ON login_attempts(key, at);
CREATE TABLE IF NOT EXISTS usage (
  user_id TEXT NOT NULL, day TEXT NOT NULL, replies INTEGER NOT NULL DEFAULT 0, ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS violation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, level TEXT NOT NULL, attempt INTEGER NOT NULL,
  violations TEXT NOT NULL, created_at INTEGER NOT NULL
);
`;

/** Columns added to tables that already exist in older databases (ALTER TABLE ADD COLUMN when missing). */
export const ADDED_COLUMNS: { table: string; column: string; sql: string }[] = [
  { table: "users", column: "username", sql: "username TEXT" },
  { table: "users", column: "password_hash", sql: "password_hash TEXT" },
  { table: "users", column: "role", sql: "role TEXT NOT NULL DEFAULT 'student'" },
  { table: "users", column: "disabled", sql: "disabled INTEGER NOT NULL DEFAULT 0" },
  { table: "users", column: "token_version", sql: "token_version INTEGER NOT NULL DEFAULT 0" },
  { table: "users", column: "photo", sql: "photo TEXT" },
  { table: "users", column: "daily_minutes", sql: "daily_minutes INTEGER" },
  { table: "users", column: "daily_replies", sql: "daily_replies INTEGER" },
  { table: "users", column: "last_active_at", sql: "last_active_at INTEGER" },
];

/** Runs after ADDED_COLUMNS, so it may use the new columns. */
export const POST_DDL = `
CREATE UNIQUE INDEX IF NOT EXISTS users_username ON users(username);
`;
