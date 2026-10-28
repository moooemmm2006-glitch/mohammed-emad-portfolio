# اتكلم ألماني · Sprich Deutsch

A **speaking-first** German practice website for Arabic speakers. You talk out loud with one of four
AI conversation partners — **A1 Lena, A2 Jonas, B1 Mira, B2 Dr. Tobias Wendt** — each locked to its
CEFR level and each with its own voice. When you end the conversation you get a detailed report
(in Arabic by default) that is compared with your previous sessions, and a weakness tracker remembers
what you need to work on.

Other sections (Vokabeln, Grammatik, Hören, Lesen, Schreiben, Prüfungen) are "coming soon" placeholders.

## Quick start

```bash
cd german-speaking
npm install
cp .env.example .env.local      # then put your key in ANTHROPIC_API_KEY
npm run dev                     # http://localhost:3000
```

- **No key?** The app still runs in a clearly-labelled *demo mode* with a built-in mock partner and a
  rule-based report, so you can click through the whole flow.
- **Demo data:** `npm run seed:demo` adds five fake past sessions (no personal data) so the dashboard
  and the "since last time" comparison have something to show.
- **Browsers:** use **Chrome or Edge** (desktop or Android). Conversations are voice-only; in browsers
  without speech recognition the app says so in Arabic (or enable the Whisper provider below, which
  works in any browser with `MediaRecorder`).

## Speaking: how a turn works

- Tap the big circle (or, in hands-free mode — the default — just start talking after the partner).
- Pause, hesitate and think as long as you like: your turn ends **only after a silence** (default 3 s,
  1.5–6 s in Settings). The browser stops recognition by itself during pauses; the app restarts it
  automatically and keeps collecting the same turn, then sends everything as **one** message. A thin
  ring around the circle fills during the silence so you can see when it is about to send.
- Tap again while talking = "I'm done, send now". Start talking while the partner speaks = the
  partner stops (barge-in) and your turn starts; the partner's own voice coming back through the
  speakers is filtered out.
- The circle shows motivating German words (*Sprich einfach!*, *Du schaffst das!* …) and the state:
  *Ich höre zu…*, *Moment…*, *Hör gut zu!*.
- The partner behaves like a voice assistant limited only in *language*: it answers what you actually
  asked first (explanations, meanings, opinions, stories, advice), then keeps chatting. Grammar
  explanations follow a fixed shape (what it is, rule, 3–5 examples, a typical mistake, "now you try");
  A1/A2 may add one or two short Arabic sentences, which are shown but not read aloud.
- Partner voice: waits for the browser's voice list, unlocks speech on the first tap, cancels stale
  speech before each reply, retries a failed sentence once with another German voice (then the default
  voice), and only then shows an error with a "try again" button.
- Speed control 1×–2.5× per partner (saved). Browser network voices top out around 2×; the app clamps and
  shows the real maximum.

Other commands: `npm run build` · `npm start` · `npm test` · `npm run lint` · `npm run typecheck`.

## Deploy on Vercel (to use it on your phone)

1. In Vercel: **Add New… → Project → Import** this GitHub repository.
2. **Root Directory:** `german-speaking` (framework is detected as Next.js; keep the defaults).
3. **Environment Variables:** `ANTHROPIC_API_KEY` and **`AUTH_SECRET`** (a long random string, e.g. from
   `openssl rand -base64 32`; it signs the login cookies — without it login is refused on Vercel).
4. **Storage → Turso (Marketplace) → Create database → connect it to this project.** This adds
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Without it the app still runs, but Vercel's disk is
   temporary, so sessions and reports can disappear (the home page shows a warning).
5. *(Optional)* **Storage → Blob → Create → connect it to this project** for profile photos
   (adds `BLOB_READ_WRITE_TOKEN`). Without Blob, photos are stored small in the database.
6. **Deploy**, open the URL in Chrome on Android/desktop (HTTPS is needed for the microphone),
   **create the first account — it becomes the admin** and takes over any data saved before accounts
   existed — and allow microphone access.

Every push to the connected branch redeploys automatically.

## Configuration (`.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Claude API key (server only; never sent to the browser) |
| `ANTHROPIC_CHAT_MODEL` | `claude-haiku-5-5` | Fast model for conversation turns |
| `ANTHROPIC_CHECK_MODEL` | `claude-haiku-5-5` | Level checker, hints, context summaries |
| `ANTHROPIC_REPORT_MODEL` | `claude-opus-5-5` | Post-conversation report |
| `LLM_PROVIDER=mock` | – | Force demo mode even with a key |
| `NEXT_PUBLIC_AI_CHAT_ENABLED` | `false` | `true` brings back the in-site AI conversation (free chat, talk about a video). Read at build time: redeploy after changing it |
| `TTS_PROVIDER` | `webspeech` | `webspeech` · `openai` · `elevenlabs` |
| `OPENAI_API_KEY` | – | For OpenAI TTS and Whisper STT |
| `OPENAI_TTS_VOICE_A1…B2` | nova/echo/shimmer/onyx | One voice per level |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_A1…B2` | – | ElevenLabs, one voice ID per level |
| `STT_PROVIDER` | `webspeech` | `webspeech` · `openai` (Whisper) |
| `DATABASE_PATH` | `./data/german-speaking.db` | Local SQLite file |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | – | Hosted libSQL database (used instead of the file when set) |
| `AUTH_SECRET` | dev secret locally | Signs session cookies (required on Vercel, ≥ 16 chars) |
| `BLOB_READ_WRITE_TOKEN` | – | Vercel Blob for profile photos (falls back to the database) |
| `USAGE_TZ` | `Africa/Cairo` | Time zone of the "day" for daily usage limits |
| `LOG_LEVEL_VIOLATIONS=1` | on in dev | Print level-checker violations to the console |

If a premium provider is selected but its key is missing, the app silently falls back to the browser
(Web Speech API). In **Settings** you can also choose per device: automatic / browser / server.

## Layout (v9)

- **Header:** "المستوى / Niveau / Level" with the four level pills (A1 · A2 · B1 · B2), the language switcher
  (العربية · Deutsch · English), dark mode and the profile circle. Progress, reports, settings and the admin
  page are in the profile menu. `/` opens the learner's last level.
- **Level page** `/level/a1` … `/level/b2`: name, description, progress per skill, a 3D badge, and four
  skills: 🗣️ Themen & Sprechen (free conversation, today's review, book topics) · 🎧 Hören (Nicos Weg /
  Video-Thema) · 📖 Lesen (the book's sections as texts, tap for the Arabic meaning, a quiz per section,
  "new text" with an API key) · ✍️ Schreiben (translate into German, complete the sentence; free writing
  corrected by the AI with a key — its mistakes go into the weakness tracker). Lesen and Schreiben work
  without an API key.
- **Languages:** `messages/ar.json`, `de.json`, `en.json` (same keys, checked by a test). The browser gets
  only the active language; the choice is saved per account and in a cookie.
- **3D & motion:** level switches turn like a cube (click or swipe), cards tilt, skills flip, the level
  colour morphs, the speaking orb is a glossy sphere with 3D rings. The badge uses React Three Fiber, loaded
  lazily after the page is idle. Settings → "تأثيرات 3D": automatic / on / reduced / off;
  `prefers-reduced-motion` always turns 3D off.

## Talk with Gemini (v10)

Without an Anthropic key the free conversation happens in **Gemini** (gemini.google.com or the Gemini
app, voice with **Gemini Live**), which is free for the learner. The site only prepares it:

- **Level card** at the top of *Themen & Sprechen* (A1–B2), a **topic card** on every book topic page,
  and a small **"talk about this video"** link under every video on *Hören*.
- **"ابدأ مع Gemini"** copies the instructions and opens `https://gemini.google.com/app` in one tap
  (the tab opens synchronously so iOS Safari doesn't block it; copy uses a hidden textarea +
  `execCommand("copy")` first and the Clipboard API as backup). "Copy only" and an editable
  "See the instructions" are there too.
- The instructions live in `data/gemini-prompts.ts`: one per level (`LEVEL_RULES`), plus the topic
  part (title, first 10 words, grammar of the book topic) or the video title.
- **"Done? Paste Gemini's report here"** saves the report Gemini writes when you say "Bericht"
  (table `gemini_sessions`); it shows under *Reports* with a Gemini tag and adds 2 points per
  session (max 20) to the level's *Sprechen* bar.
- The icon is our own four-point star; no Google/Gemini logos or brand assets.
- The in-site AI chat stays in the code behind `NEXT_PUBLIC_AI_CHAT_ENABLED` (default `false`).
  While it's off, the book topic talk is always the scripted one and no demo notices are shown.

## The book: "Sprich Deutsch" (A1 → B2)

The learner's own book lives in `data/book/` (`a1.json` … `b2.json`, `index.json`): 100 topics,
10,000 sentences with Egyptian-Arabic meanings, 546 grammar boxes. A1 = topics 1–15, A2 = 16–40,
B1 = 41–70, B2 = 71–100. It is loaded on the server only (`src/lib/book.ts`, one lazy chunk per level,
validated with zod once); the browser only receives the topic that is opened.

Each level page lists only its own topics (with ✓ when finished), plus "محادثة حرة" and today's review.
A topic page has three modes, all working **without an API key**:

- **اسمع وكرر (shadowing):** the partner reads a sentence, you repeat it, the app compares word by word
  (`src/lib/bookCompare.ts`: normalised, digits = number words, one-letter recognition slips allowed,
  word order matters) and marks missed words. "اعكس" shows only the Arabic; auto-play goes through the
  sentences hands-free. "إنهاء وتقرير" saves a practice report (sentences to repeat, book version,
  Arabic meaning, related grammar point).
- **اتكلم في الموضوع (guided conversation):** without a key the partner asks the book's questions in
  order (`src/lib/bookScript.ts`), compares your answer with the book's answers and corrects gently;
  sections without questions use "Wie sagt man das auf Deutsch?". With a key the level's AI partner gets
  the topic (title, intro, vocabulary, sections, ~30 book sentences, grammar formulas) in its system
  prompt and stays inside it — the level lock is unchanged. The report lists book sentences said wrong.
- **القواعد:** the topic's grammar boxes with playable examples and "اتمرن على القاعدة دي".

Progress is per user (`book_progress`): best score per sentence; a topic is finished when 80% of its
sentences were said correctly once. Sentences said wrong come back in "مراجعة النهارده" after 1 day,
then 3 days, then a week.

## DW videos per level

All IDs and the feed live in one file, `data/videos.ts`.

- **A1, A2, B1 – "Nicos Weg"** (DW's free course): each level page has a "🎬 فيديوهات – Nicos Weg" tab
  with the level's full movie (A1 `4-eDoThe6qo`, A2 `Lg5P2w_Ro1c`, B1 `LkufozluseI`) and, where the
  start of the level in the official playlist is verified (`playlistStartIndex`, so far A1 only), the
  episodes one by one. Only the official videos are embedded with the privacy-enhanced YouTube player
  (`youtube-nocookie.com`), loaded only after a tap; the credit "Nicos Weg – Deutsche Welle (DW)" and a
  link to the original are always shown.
- **B2 – DW "Video-Thema"**: our server reads DW's official podcast feed
  (`https://rss.dw.com/xml/DKpodcast_videothema_de`, cached 12 h, last good copy if DW is down) and shows
  the latest 20 episodes; an episode plays DW's own video file in a `<video>` player, with its text,
  source link and credit. `VIDEO_THEMA_FEED_URL` can point to a local copy of the feed for tests.
- Per user: last position ("كمّل من مكان ما وقفت", via the YouTube IFrame API), "خلّصت" buttons, progress
  on the level cards, and "اتكلم عن اللي شفته" — a conversation with the level partner about the video
  (simple questions at the level without an API key; with a key the partner gets the video in its prompt).

## Accounts

- **Sign-up:** name, username (unique, lowercase, `a-z 0-9 _`, 3–20 chars), password (≥ 8, bcrypt-hashed,
  never stored or logged in plain text), optional photo (cropped to a circle in the browser → 256×256 WebP).
- **Login:** username + password; "remember me" keeps you logged in for 30 days, otherwise until the
  browser closes. 5 failed tries per username + IP lock that pair for 15 minutes.
- **Sessions:** signed, `httpOnly`, `sameSite=lax`, `secure` cookies (HMAC-SHA256 with `AUTH_SECRET`).
  Changing a password, a reset by the admin or disabling an account logs out every device at once.
- **Every API route checks the session**, and every session, report, weakness, setting and usage row
  belongs to one user. Other people's sessions answer 404. The partner's memory and the report
  comparison only use the logged-in learner's own history.
- **Admin:** the first account. `/admin` lists students (joined, last activity, sessions, minutes in the
  last 7 days), sets a new temporary password, disables/enables or deletes accounts, and sets daily
  limits (minutes and/or partner replies). When a limit is reached the conversation shows a friendly
  message instead of a reply.
- Built so email or Google login can be added later (nullable columns next to `username`).
- `npm run seed:demo [username]` adds demo sessions to that account.

## How the level lock works

The rule "the partner never speaks above its level" is enforced in code, not only in a prompt
(`src/lib/levelLock/`):

1. **Per-level system prompt** (`src/lib/prompts.ts`, `src/lib/levels.ts`, `src/lib/levelKnowledge.ts`):
   a warm, talkative persona that talks about any topic, tells short anecdotes, gives opinions and
   explains grammar/words with examples when asked — always inside its level. It contains allowed and
   forbidden grammar, topics per level, what grammar it can explain and how simply, typical mistakes of
   Arabic speakers, and few-shot replies (chat, explanation, opinion, story). Chat turns stay short;
   explanations, stories and opinions may be longer (`src/lib/intent.ts` detects which one the learner asked for).
   A1/A2 may add one short Arabic hint in brackets inside an explanation (shown, not read aloud).
2. **Streaming, per-sentence checks** (`streamLevelLocked`): the reply streams in; each finished sentence
   gets a heuristic check (length, over-long words, regexes for structures above the level, no repeated
   sentences) and — in strict mode — a quick LLM check (fast model, small output). Checks run in parallel;
   sentences are emitted in order, so speech starts after the **first** sentence passes.
3. A sentence that fails is **regenerated on its own** (checker suggestion → one-sentence rewrite); if it
   still fails it is dropped. A turn without any question gets a short level-safe follow-up question.
4. Violations are logged to the `violation_log` table (and to the console in development).

Settings → *Level checking*: **strict** (default) or **fast** (heuristics only before speaking, LLM check
afterwards to steer the next turn).

Latency: database writes and context summaries happen after the reply was sent, old turns are
summarised (last 10 kept verbatim), and in development the server logs the time to the first sentence
and the browser logs end-of-turn → first audio (`[latency]` in the console).

The "مش فاهم / I'm stuck" button gives the meaning and a tip in Arabic or English, plus a simpler German
rephrase that is checked against the level as well.

## Reports, memory and progress

- **Every sentence is corrected.** Before the report is written, each learner turn (fillers like "Mhm"
  excluded) is corrected individually — with Claude (the report model, in batches of 10; turns missing
  from the answer are re-requested) or, in demo mode, with a rule-based checker (repeated words, dative
  after prepositions, verb order after modal verbs, Perfekt with sein, frequent Arabic-speaker mistakes;
  labelled as a demo correction). The "التصحيح" tab shows each sentence with the wrong parts in red and
  the corrected parts in green, plus the explanation of every fix. The mistakes list is built from all
  fixes, grouped by category, and feeds the weakness tracker; "what you did well" may only quote
  sentences that were correct.

- The report is generated by the report model with **structured JSON output**, validated with zod
  (`src/lib/report/schema.ts`), retried when the JSON is invalid, then normalised (scores clamped,
  tags normalised).
- Before each report, the last 5 reports and the **weakness tracker** are given to the model, so the
  report opens with **"since last time"**: improved / came back / new / still open, plus the trend over
  the last 5 sessions. A deterministic tracker diff is shown next to it.
- Tracker rules (`src/lib/report/weakness.ts`): first time → *new*; seen again with ≤ 60 % of the last
  count → *improving*; otherwise *persisting*; absent once → *improving*; absent twice → *resolved*;
  a resolved issue that comes back → *persisting* (marked as a regression).
- With *Settings → practise my weak point* on, the next partner gently steers the conversation towards
  your top open grammar weakness, still at its own level.
- The progress dashboard shows scores over time, minutes per day/week, a streak, words spoken,
  mistake types per session, open weaknesses and the full session history.
- All data lives in SQLite via libSQL — a local file in `data/`, or a Turso database when deployed — with JSON export/import and "delete all my data" in Settings.
  The schema has a `user_id` everywhere so multi-user auth can be added later.
- Sessions are saved turn by turn. If you close the tab mid-conversation, you can continue it or create
  its report later from the *Start speaking* page.

## Known limitations

- **Pronunciation feedback is indicative only.** The browser's speech recognition returns text and a
  confidence value, not phonetic scoring. The report uses low-confidence words and alternative hypotheses
  as hints and adds typical pitfalls for Arabic speakers (ch/sch, ü/ö, p/b, r, final devoicing, vowel
  length, z/w/v), and says so clearly. A provider with real pronunciation scoring is not implemented yet.
- Web Speech recognition only works in Chrome/Edge and sends audio to the browser vendor's service.
- Barge-in (interrupting the partner) works in hands-free mode with Web Speech recognition. The browser
  can't cancel the partner's voice from the microphone, so an echo filter ignores words the partner just
  said; with loud speakers it can still occasionally trigger. Headphones work best; it can be switched
  off in Settings.
- Demo mode (no API key) uses pre-written replies: explanations for 13 grammar topics per level, answers
  to simple questions about the partner, and reactions that pick up a word you used. Real conversation
  needs the key.
- Browser voices differ per device; pick and preview them in Settings.

## Project structure

```
src/app/            pages (home, speak, conversation, reports, progress, settings, coming soon) + API routes
src/components/     AppShell, Conversation, Avatar (SVG personas), MicCheck, LevelCard…
src/lib/levels.ts   personas, level rules, few-shot examples, topics, tags
src/lib/levelLock/  heuristic checker + regenerate/fallback wrapper
src/lib/llm/        Anthropic client, offline mock, JSON retry
src/lib/report/     report schema, generation, mock report, weakness tracker
src/lib/db/         SQLite/libSQL (Drizzle) schema, additive migration and repository
src/lib/book*.ts    the book: loader, comparison, scripted conversation, progress/review
data/book/          the book "Sprich Deutsch" as JSON
src/lib/auth/       accounts: signed tokens, bcrypt, rate limiting, session helpers
src/lib/usage.ts    daily usage and limits · src/lib/admin.ts admin overview · src/lib/photo.ts Blob/DB photos
src/lib/client/     browser TTS/STT providers, i18n (AR/EN), API helpers
tests/              Vitest: level lock, report schema, tracker, full mocked flow, accounts/isolation/limits
scripts/seed-demo.ts
```

---

## بالعربي باختصار

**الفكرة:** موقع بيخليك **تتكلم** ألماني بصوتك مع شريك محادثة على مستواك بالظبط (A1 لينا، A2 يوناس،
B1 ميرا، B2 د. توبياس). كل شريك ممنوع يتكلم فوق مستواه، وفي آخر الجلسة بيطلعلك تقرير مفصّل بالعربي
فيه أخطاءك وتصحيحها، ملاحظات النطق، المفردات، واجب للمرة الجاية — ومقارنة باللي فات.

**التشغيل:**

1. `cd german-speaking` وبعدين `npm install`
2. انسخ `.env.example` لـ `.env.local` وحط مفتاحك في `ANTHROPIC_API_KEY`
3. `npm run dev` وافتح `http://localhost:3000`
4. استخدم **Chrome** أو **Edge** عشان التعرّف على الكلام يشتغل.

من غير مفتاح الموقع بيشتغل في **وضع تجريبي** بردود بسيطة. ولو عايز تشوف لوحة التقدّم فيها بيانات،
شغّل `npm run seed:demo` (بيانات وهمية مش شخصية).

**النشر على Vercel عشان تجربه من الموبايل:** اعمل Project جديد من نفس الريبو، وخلي الـ Root Directory
`german-speaking`، وحط `ANTHROPIC_API_KEY` و `AUTH_SECRET` (نص عشوائي طويل)، ووصّل قاعدة بيانات Turso
من Storage عشان جلساتك متتمسحش، و Blob (اختياري) لصور البروفايل. أول حساب يتعمل بيبقى هو المسؤول.
التفاصيل فوق في قسم "Deploy on Vercel".

**تنبيه:** ملاحظات النطق استرشادية بس، مش تقييم معتمد.
