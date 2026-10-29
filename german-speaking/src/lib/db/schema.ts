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

/** Per user and book sentence: best score, and when to review it again (spaced repetition). */
export const bookProgress = sqliteTable(
  "book_progress",
  {
    userId: text("user_id").notNull(),
    n: integer("n").notNull(), // global sentence number 1–10000
    topic: integer("topic").notNull(),
    best: integer("best").notNull(),
    attempts: integer("attempts").notNull(),
    correct: integer("correct").notNull(),
    lastAt: integer("last_at").notNull(),
    /** 0 = review after 1 day, 1 = 3 days, 2 = a week; null = nothing to review */
    reviewStage: integer("review_stage"),
    dueAt: integer("due_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.n] })],
);

/** Per user and video: last position and whether it was finished. */
export const videoProgress = sqliteTable(
  "video_progress",
  {
    userId: text("user_id").notNull(),
    key: text("key").notNull(), // nicos:A1:movie · nicos:A1:playlist · vt:<episode id>
    position: integer("position").notNull(), // seconds
    duration: integer("duration"), // seconds, when known
    watched: integer("watched").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

/** Best score per user, skill and topic part: read = section quiz (part 1–5), write = exercise (0 translate, 1 complete). */
export const skillScores = sqliteTable(
  "skill_scores",
  {
    userId: text("user_id").notNull(),
    skill: text("skill").notNull(), // read | write
    topic: integer("topic").notNull(),
    part: integer("part").notNull(),
    best: integer("best").notNull(),
    attempts: integer("attempts").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skill, t.topic, t.part] })],
);

/** Free writing corrected by the AI; its mistakes count in the weakness tracker like a spoken report. */
export const writingChecks = sqliteTable("writing_checks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  topic: integer("topic").notNull(),
  createdAt: integer("created_at").notNull(),
  json: text("json").notNull(),
});

/** A report the learner pasted after talking with Gemini (stored as text, shown under "Reports"). */
export const geminiSessions = sqliteTable("gemini_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  level: text("level").notNull(),
  topic: integer("topic"), // book topic number, if the talk was about one
  video: text("video"), // video title, if the talk was about one
  text: text("text").notNull(),
  createdAt: integer("created_at").notNull(),
});

/** Admin changes to a topic's Easy German videos: "add" a new one, or "hide" one from the JSON file. */
export const topicVideos = sqliteTable(
  "topic_videos",
  {
    topic: integer("topic").notNull(),
    youtubeId: text("youtube_id").notNull(),
    action: text("action").notNull(), // add | hide
    title: text("title").notNull(),
    channel: text("channel").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.topic, t.youtubeId] })],
);

/** Site-wide settings the admin edits (channel link, explainer video, playlist, channel photo…). */
export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/** The owner's own vlogs for "☕ استراحة" (newest first). */
export const vlogs = sqliteTable("vlogs", {
  youtubeId: text("youtube_id").primaryKey(),
  title: text("title").notNull(),
  descriptionAr: text("description_ar").notNull(),
  addedAt: integer("added_at").notNull(),
});

/** Admin-added DKW podcast videos/playlists. Static episodes stay in data/podcasts.ts. */
export const podcastItems = sqliteTable("podcast_items", {
  id: text("id").primaryKey(),
  youtubeId: text("youtube_id"),
  playlistId: text("playlist_id"),
  title: text("title").notNull(),
  channel: text("channel").notNull(),
  levels: text("levels").notNull(),
  addedAt: integer("added_at").notNull(),
});

/** Admin film additions and hide overrides for file-based recommendations. */
export const filmItems = sqliteTable("film_items", {
  id: text("id").primaryKey(),
  action: text("action").notNull(), // add | hide
  data: text("data").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const grammarProgress = sqliteTable("grammar_progress", {
  userId: text("user_id").notNull(), level: text("level").notNull(), lessonId: text("lesson_id").notNull(),
  completed: integer("completed").notNull().default(0), favorite: integer("favorite").notNull().default(0), updatedAt: integer("updated_at").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.level, t.lessonId] })]);

/** Shared study rooms, opt-in presence, memberships, and persisted chat. */
export const communityPreferences = sqliteTable("community_preferences", {
  userId: text("user_id").primaryKey(), shareOnline: integer("share_online").notNull().default(0), lastSeenAt: integer("last_seen_at").notNull(), updatedAt: integer("updated_at").notNull(),
});
export const studyRooms = sqliteTable("study_rooms", {
  id: text("id").primaryKey(), hostUserId: text("host_user_id").notNull(), name: text("name").notNull(), description: text("description").notNull().default(""),
  visibility: text("visibility").notNull(), capacity: integer("capacity").notNull(), level: text("level").notNull(), mode: text("mode").notNull(), goal: text("goal").notNull().default(""),
  approvalRequired: integer("approval_required").notNull().default(0), inviteTokenHash: text("invite_token_hash"), status: text("status").notNull().default("active"),
  timerStatus: text("timer_status").notNull().default("idle"), timerPhase: text("timer_phase").notNull().default("focus"), timerDurationMinutes: integer("timer_duration_minutes").notNull().default(25),
  breakDurationMinutes: integer("break_duration_minutes").notNull().default(5), timerStartedAt: integer("timer_started_at"), timerEndsAt: integer("timer_ends_at"), timerPausedRemainingMs: integer("timer_paused_remaining_ms"),
  timerElapsedMs: integer("timer_elapsed_ms").notNull().default(0), timerRunId: text("timer_run_id"), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(), endedAt: integer("ended_at"),
});
export const studyRoomMembers = sqliteTable("study_room_members", {
  roomId: text("room_id").notNull(), userId: text("user_id").notNull(), role: text("role").notNull().default("member"), status: text("status").notNull().default("active"),
  joinedAt: integer("joined_at").notNull(), lastSeenAt: integer("last_seen_at").notNull(), handRaisedAt: integer("hand_raised_at"),
}, (t) => [primaryKey({ columns: [t.roomId, t.userId] })]);
export const studyRoomMessages = sqliteTable("study_room_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }), roomId: text("room_id").notNull(), userId: text("user_id").notNull(), body: text("body").notNull(), createdAt: integer("created_at").notNull(),
});
export const studyRoomSessions = sqliteTable("study_room_sessions", {
  id: text("id").primaryKey(), roomId: text("room_id").notNull(), startedAt: integer("started_at").notNull(), endedAt: integer("ended_at"), activeMilliseconds: integer("active_milliseconds").notNull().default(0),
  goal: text("goal").notNull().default(""), participantCount: integer("participant_count").notNull().default(0), completed: integer("completed").notNull().default(0),
});

/** One finished ⏱️ focus session (the "خزنتي" vault). */
export const focusSessions = sqliteTable("focus_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at").notNull(),
  minutes: integer("minutes").notNull(),
  goal: text("goal"),
  goalDone: integer("goal_done"), // null = not answered, 1 = yes, 0 = not yet
  level: text("level"), // the level page the learner was on (study time for that level)
});

/** Clicks on the channel buttons, per place. */
export const channelClicks = sqliteTable("channel_clicks", {
  place: text("place").primaryKey(),
  count: integer("count").notNull(),
});

/** One shadowing / review run, kept for its report. */
export const bookPractice = sqliteTable("book_practice", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  topic: integer("topic"), // null for a mixed review run
  mode: text("mode").notNull(), // shadow | reverse | review | grammar
  createdAt: integer("created_at").notNull(),
  json: text("json").notNull(),
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
  /** Book topic number (1–100) for a guided conversation about one topic of the book. */
  bookTopic: integer("book_topic"),
  /** JSON {kind, level, title?, summary?}: a conversation about a DW video the learner watched. */
  video: text("video"),
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

export const readingBooks = sqliteTable(
  "reading_books",
  {
    userId: text("user_id").notNull(),
    level: text("level").notNull(),
    currentPage: integer("current_page").notNull().default(0),
    totalPages: integer("total_pages"),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.level] })],
);

export const readingDays = sqliteTable(
  "reading_days",
  {
    userId: text("user_id").notNull(),
    level: text("level").notNull(),
    day: text("day").notNull(),
    completedAt: integer("completed_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.level, t.day] })],
);

export const readingStepDays = sqliteTable(
  "reading_step_days",
  {
    userId: text("user_id").notNull(),
    level: text("level").notNull(),
    day: text("day").notNull(),
    steps: text("steps").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.level, t.day] })],
);

export const readingNotes = sqliteTable("reading_notes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  level: text("level").notNull(),
  word: text("word").notNull(),
  meaning: text("meaning").notNull().default(""),
  sentence: text("sentence").notNull().default(""),
  page: integer("page"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const GRAMMAR_DDL = "CREATE TABLE IF NOT EXISTS grammar_progress (user_id TEXT NOT NULL, level TEXT NOT NULL, lesson_id TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, favorite INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, level, lesson_id)); CREATE INDEX IF NOT EXISTS grammar_progress_user_level ON grammar_progress(user_id, level)";

export const COMMUNITY_DDL = [
  "CREATE TABLE IF NOT EXISTS community_preferences (user_id TEXT PRIMARY KEY, share_online INTEGER NOT NULL DEFAULT 0, last_seen_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS study_rooms (id TEXT PRIMARY KEY, host_user_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', visibility TEXT NOT NULL, capacity INTEGER NOT NULL, level TEXT NOT NULL, mode TEXT NOT NULL, goal TEXT NOT NULL DEFAULT '', approval_required INTEGER NOT NULL DEFAULT 0, invite_token_hash TEXT, status TEXT NOT NULL DEFAULT 'active', timer_status TEXT NOT NULL DEFAULT 'idle', timer_phase TEXT NOT NULL DEFAULT 'focus', timer_duration_minutes INTEGER NOT NULL DEFAULT 25, break_duration_minutes INTEGER NOT NULL DEFAULT 5, timer_started_at INTEGER, timer_ends_at INTEGER, timer_paused_remaining_ms INTEGER, timer_elapsed_ms INTEGER NOT NULL DEFAULT 0, timer_run_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, ended_at INTEGER)",
  "CREATE INDEX IF NOT EXISTS study_rooms_directory ON study_rooms(status, visibility, created_at)",
  "CREATE TABLE IF NOT EXISTS study_room_members (room_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', status TEXT NOT NULL DEFAULT 'active', joined_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, hand_raised_at INTEGER, PRIMARY KEY (room_id, user_id))",
  "CREATE INDEX IF NOT EXISTS study_room_members_presence ON study_room_members(room_id, status, last_seen_at)",
  "CREATE INDEX IF NOT EXISTS study_room_members_user ON study_room_members(user_id, status, last_seen_at)",
  "CREATE TABLE IF NOT EXISTS study_room_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT NOT NULL, user_id TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS study_room_messages_history ON study_room_messages(room_id, id)",
  "CREATE INDEX IF NOT EXISTS study_room_messages_rate ON study_room_messages(room_id, user_id, created_at)",
  "CREATE TABLE IF NOT EXISTS study_room_sessions (id TEXT PRIMARY KEY, room_id TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, active_milliseconds INTEGER NOT NULL DEFAULT 0, goal TEXT NOT NULL DEFAULT '', participant_count INTEGER NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0)",
  "CREATE INDEX IF NOT EXISTS study_room_sessions_room ON study_room_sessions(room_id, started_at)",
].join(";");

export const READING_DDL = [
  "CREATE TABLE IF NOT EXISTS reading_books (user_id TEXT NOT NULL, level TEXT NOT NULL, current_page INTEGER NOT NULL DEFAULT 0, total_pages INTEGER, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, level))",
  "CREATE TABLE IF NOT EXISTS reading_days (user_id TEXT NOT NULL, level TEXT NOT NULL, day TEXT NOT NULL, completed_at INTEGER NOT NULL, PRIMARY KEY (user_id, level, day))",
  "CREATE INDEX IF NOT EXISTS reading_days_user_level_day ON reading_days(user_id, level, day)",
  "CREATE TABLE IF NOT EXISTS reading_step_days (user_id TEXT NOT NULL, level TEXT NOT NULL, day TEXT NOT NULL, steps TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, level, day))",
  "CREATE TABLE IF NOT EXISTS reading_notes (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, level TEXT NOT NULL, word TEXT NOT NULL, meaning TEXT NOT NULL DEFAULT '', sentence TEXT NOT NULL DEFAULT '', page INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS reading_notes_user_level_created ON reading_notes(user_id, level, created_at)",
].join(";");

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
CREATE TABLE IF NOT EXISTS book_progress (
  user_id TEXT NOT NULL, n INTEGER NOT NULL, topic INTEGER NOT NULL, best INTEGER NOT NULL, attempts INTEGER NOT NULL,
  correct INTEGER NOT NULL, last_at INTEGER NOT NULL, review_stage INTEGER, due_at INTEGER,
  PRIMARY KEY (user_id, n)
);
CREATE INDEX IF NOT EXISTS book_progress_topic ON book_progress(user_id, topic);
CREATE INDEX IF NOT EXISTS book_progress_due ON book_progress(user_id, due_at);
CREATE TABLE IF NOT EXISTS video_progress (
  user_id TEXT NOT NULL, key TEXT NOT NULL, position INTEGER NOT NULL, duration INTEGER, watched INTEGER NOT NULL,
  updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, key)
);
CREATE TABLE IF NOT EXISTS skill_scores (
  user_id TEXT NOT NULL, skill TEXT NOT NULL, topic INTEGER NOT NULL, part INTEGER NOT NULL, best INTEGER NOT NULL,
  attempts INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, skill, topic, part)
);
CREATE TABLE IF NOT EXISTS writing_checks (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic INTEGER NOT NULL, created_at INTEGER NOT NULL, json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS writing_checks_user ON writing_checks(user_id, created_at);
CREATE TABLE IF NOT EXISTS gemini_sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, level TEXT NOT NULL, topic INTEGER, video TEXT, text TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS topic_videos (
  topic INTEGER NOT NULL, youtube_id TEXT NOT NULL, action TEXT NOT NULL, title TEXT NOT NULL, channel TEXT NOT NULL,
  created_at INTEGER NOT NULL, PRIMARY KEY (topic, youtube_id)
);
CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS vlogs (youtube_id TEXT PRIMARY KEY, title TEXT NOT NULL, description_ar TEXT NOT NULL, added_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS podcast_items (
  id TEXT PRIMARY KEY, youtube_id TEXT, playlist_id TEXT, title TEXT NOT NULL, channel TEXT NOT NULL,
  levels TEXT NOT NULL, added_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS film_items (id TEXT PRIMARY KEY, action TEXT NOT NULL, data TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER NOT NULL, minutes INTEGER NOT NULL,
  goal TEXT, goal_done INTEGER, level TEXT
);
CREATE INDEX IF NOT EXISTS focus_sessions_user ON focus_sessions(user_id, ended_at);
CREATE TABLE IF NOT EXISTS channel_clicks (place TEXT PRIMARY KEY, count INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS gemini_sessions_user ON gemini_sessions(user_id, created_at);
CREATE TABLE IF NOT EXISTS book_practice (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic INTEGER, mode TEXT NOT NULL, created_at INTEGER NOT NULL, json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS book_practice_user ON book_practice(user_id, created_at);
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
  { table: "sessions", column: "book_topic", sql: "book_topic INTEGER" },
  { table: "sessions", column: "video", sql: "video TEXT" },
];

/** Runs after ADDED_COLUMNS, so it may use the new columns. */
export const POST_DDL = `
CREATE UNIQUE INDEX IF NOT EXISTS users_username ON users(username);
`;
