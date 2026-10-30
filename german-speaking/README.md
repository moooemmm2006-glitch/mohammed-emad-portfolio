# اتكلم ألماني · Sprich Deutsch

A German practice website for Arabic speakers (A1 → B2), built on the learner's own book
"Sprich Deutsch". Each level has four skills: **Themen & Sprechen** (book topics with listen & repeat
and grammar, plus **voice conversations with Gemini**), **Hören** (DW and Easy German videos), **Lesen**
and **Schreiben**. Progress is saved per account; the interface is in Arabic, German and English.

## Quick start

```bash
cd german-speaking
npm install
cp .env.example .env.local      # AUTH_SECRET; ANTHROPIC_API_KEY is optional
npm run dev                     # http://localhost:3000
```

- **No API key needed.** Everything works without one. An Anthropic key only adds "new reading text"
  (Lesen) and "free writing" corrections (Schreiben).
- **Browsers:** "اسمع وكرر" needs speech recognition: use **Chrome or Edge** (desktop or Android), or the
  Whisper provider below.

Other commands: `npm run build` · `npm start` · `npm test` · `npm run lint` · `npm run typecheck`.

## Deploy on Vercel (to use it on your phone)

1. In Vercel: **Add New… → Project → Import** this GitHub repository.
2. **Root Directory:** `german-speaking` (framework is detected as Next.js; keep the defaults).
3. **Environment Variables:** **`AUTH_SECRET`** (a long random string, e.g. from
   `openssl rand -base64 32`; it signs the login cookies — without it login is refused on Vercel).
   `ANTHROPIC_API_KEY` is optional.
4. **Storage → Turso (Marketplace) → Create database → connect it to this project.** This adds
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Without it the app still runs, but Vercel's disk is
   temporary, so progress can disappear.
5. *(Optional)* **Storage → Blob → Create → connect it to this project** for profile photos
   (adds `BLOB_READ_WRITE_TOKEN`). Without Blob, photos are stored small in the database.
6. **Deploy**, open the URL (HTTPS is needed for the microphone), **create the first account — it
   becomes the admin** — and allow microphone access.

Every push to the connected branch redeploys automatically.

## Configuration (`.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Optional: Claude for reading texts and free-writing corrections (server only) |
| `ANTHROPIC_TEXT_MODEL` | `claude-haiku-5-5` | Reading texts |
| `ANTHROPIC_CORRECTION_MODEL` | `claude-opus-5-5` | Free-writing corrections |
| `TTS_PROVIDER` | `webspeech` | `webspeech` · `openai` · `elevenlabs` |
| `OPENAI_API_KEY` | – | For OpenAI TTS and Whisper STT |
| `OPENAI_TTS_VOICE_A1…B2` | nova/echo/shimmer/onyx | One voice per level |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_A1…B2` | – | ElevenLabs, one voice ID per level |
| `STT_PROVIDER` | `webspeech` | `webspeech` · `openai` (Whisper) |
| `DATABASE_PATH` | `./data/german-speaking.db` | Local SQLite file |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | – | Hosted libSQL database (used instead of the file when set) |
| `AUTH_SECRET` | dev secret locally | Signs session cookies (required on Vercel, ≥ 16 chars) |
| `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` | – | Optional TURN relay for community voice on strict networks |
| `ADMIN_USERNAMES` | – | Comma-separated usernames that become admin when they sign up (needed for the first admin of a new production database) |
| `BLOB_READ_WRITE_TOKEN` | – | Vercel Blob for profile photos (falls back to the database) |

If a premium voice provider is selected but its key is missing, the app silently falls back to the
browser (Web Speech API). In **Settings** you can also choose per device: automatic / browser / server.

## Layout (v9)

- **Header:** "المستوى / Niveau / Level" with the four level pills (A1 · A2 · B1 · B2), the language switcher
  (العربية · Deutsch · English), dark mode and the profile circle. Progress, reports, settings and the admin
  page are in the profile menu. `/` opens the learner's last level.
- **Level page** `/level/a1` … `/level/b2`: name, description, progress per skill, a 3D badge, and four
  skills: 🗣️ Themen & Sprechen (talk with Gemini, today's review, book topics) · 🎧 Hören (Nicos Weg /
  Video-Thema) · 📖 Lesen (the book's sections as texts, tap for the Arabic meaning, a quiz per section,
  "new text" with an API key) · ✍️ Schreiben (translate into German, complete the sentence; free writing
  corrected by the AI with a key — its mistakes go into the weakness tracker). Lesen and Schreiben work
  without an API key.
- **Languages:** `messages/ar.json`, `de.json`, `en.json` (same keys, checked by a test). The browser gets
  only the active language; the choice is saved per account and in a cookie.
- **3D & motion:** level switches turn like a cube (click or swipe), cards tilt, skills flip, the level
  colour morphs. The badge uses React Three Fiber, loaded
  lazily after the page is idle. Settings → "تأثيرات 3D": automatic / on / reduced / off;
  `prefers-reduced-motion` always turns 3D off.

## Conversations: Gemini only (v10, v11)

The site has **no conversation of its own** any more (v11 removed the in-site partner, its screen, the
scripted book talk, the demo partner and their API routes). Every conversation happens in **Gemini**
(gemini.google.com or the Gemini app, voice with **Gemini Live**), which is free for the learner.
The site only prepares it:

- **Level card** at the top of *Themen & Sprechen* (A1–B2), the tab **🎙️ اتكلم مع Gemini** (2nd tab)
  on every book topic page, and a small **"talk about this video"** link under every video on *Hören*.
- **Laptop vs. phone:** on a computer the card says that Gemini answers in text there and to open the
  Gemini app on the phone for voice; on a phone it says "tap Start, paste, then tap Live 〰️ and talk".
  A help line explains how to allow the microphone.
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
- Old conversation addresses (`/level/a1/chat…`, `/speak/…/chat`, `…/talk`, `?tab=talk`) redirect
  (301) to the level or topic page. Reports of earlier in-site conversations stay readable (read-only).

## The owner's YouTube channel, explainer video and ☕ break (v14)

Calm placements only — no pop-ups, no autoplay, nothing over a lesson:

- **Creator card** in the footer of every page (avatar "M" or the channel photo, "Mohamed Emad | مُحَمَّد عِمَاد",
  "▶ اشترك في القناة", "☕ استراحة"), a compact one at the **end** of each level page next to "زهقت؟ خد استراحة ☕",
  and "قناتي على يوتيوب" (red dot) in the profile menu. Clicks on the channel buttons are counted per place
  (`channel_clicks`, shown on `/admin`).
- **Explainer video** ("إزاي تستخدم الموقع؟"): a glassy modal with the lazy `youtube-nocookie` player, opened from
  the small ▶️ header button, the footer, the profile menu and the dismissible strip at the top of the level
  pages. It opens by itself once on the first visit (remembered per account, or in a cookie when logged out)
  — but only once a video is saved.
- **Tutorials playlist** (optional): profile menu → "شروحات الموقع" → `/tutorials`.
- **☕ استراحة** (`/pause`): the owner's own vlogs as full players (loaded on tap), newest first; the first one
  (`qALULLsNpbc`) is added once automatically. After finishing a reading quiz, a writing exercise or a
  listen-&-repeat run a small toast offers the break — at most once a day.
- **Admin → "قناتي على يوتيوب":** channel link (prefilled `https://www.youtube.com/@mohammedemad-ilden`),
  explainer video, playlist, channel photo — validated (channel URL / 11-character ID / `list=`), with a live
  preview; an empty link hides its places. **"إضافة فلوج"** accepts only videos of the owner's channel
  (checked with YouTube oEmbed when reachable). Stored in `site_settings` and `vlogs`.

## The book: "Sprich Deutsch" (A1 → B2)

The learner's own book lives in `data/book/` (`a1.json` … `b2.json`, `index.json`): 100 topics,
10,000 sentences with Egyptian-Arabic meanings, 546 grammar boxes. A1 = topics 1–15, A2 = 16–40,
B1 = 41–70, B2 = 71–100. It is loaded on the server only (`src/lib/book.ts`, one lazy chunk per level,
validated with zod once); the browser only receives the topic that is opened.

Each level page lists only its own topics (with ✓ when finished, 🎧 X/Y for the videos), the level's
Gemini card and today's review. A topic page has four tabs, all working **without an API key**:

- **اسمع وكرر (shadowing):** the app reads a sentence, you repeat it, the app compares word by word
  (`src/lib/bookCompare.ts`: normalised, digits = number words, one-letter recognition slips allowed,
  word order matters) and marks missed words. "اعكس" shows only the Arabic; auto-play goes through the
  sentences hands-free. "إنهاء وتقرير" saves a practice report (sentences to repeat, book version,
  Arabic meaning, related grammar point).
- **🎙️ اتكلم مع Gemini:** the Gemini card for this topic (see below): the prompt names the level and the
  topic (German and Arabic title), its first 10 words and its grammar.
- **القواعد:** the topic's grammar boxes with playable examples and "اتمرن على القاعدة دي".
- **🎧 Hören:** the topic's Easy German videos (see below).

Progress is per user (`book_progress`): best score per sentence; a topic is finished when 80% of its
sentences were said correctly once. Sentences said wrong come back in "مراجعة النهارده" after 1 day,
then 3 days, then a week.

## Easy German videos per topic (v8)

Every book topic page has a 4th tab **🎧 Hören** with real videos from the YouTube channel
**Easy German** (and its original channel "Easy Languages") about the same theme.

- Data: `data/easy-german-videos.json` (57 topics, 70 videos, every ID checked by the owner on YouTube),
  validated with zod in `src/lib/easyGerman.ts` (`getEasyGermanVideos(topic)`). IDs are never guessed:
  a topic without a video shows "no video yet" and a YouTube **search** for `Easy German <title_de>`.
- Only the official player (`youtube-nocookie.com/embed/…`), loaded after a tap (thumbnail first);
  the credit line and a link to the original are under every video, plus "Open on YouTube" and
  "Subscribe to Easy German".
- "Watched ✓" is saved per user (`video_progress`, key `eg:<id>`, also set when a video ends);
  topic cards show **🎧 X/Y**, and *My progress* shows the Easy German videos watched per level.
- Talking about it: "اتكلم مع Gemini عن الفيديو ده" under every video (the prompt names the video).
- **Admin:** on `/admin`, add a video to any topic by pasting a YouTube link (ID checked, title from
  YouTube oEmbed when reachable) or remove one. Stored in the table `topic_videos` and merged with the
  JSON at runtime; the JSON file itself never changes.

## DW videos per level

All IDs and the feed live in one file, `data/videos.ts`.

- **A1, A2, B1 – "Nicos Weg"** (DW's free course): the level's 🎧 Hören skill shows the level's full movie (A1 `4-eDoThe6qo`, A2 `Lg5P2w_Ro1c`, B1 `LkufozluseI`) and, where the
  start of the level in the official playlist is verified (`playlistStartIndex`, so far A1 only), the
  episodes one by one. Only the official videos are embedded with the privacy-enhanced YouTube player
  (`youtube-nocookie.com`), loaded only after a tap; the credit "Nicos Weg – Deutsche Welle (DW)" and a
  link to the original are always shown.
- **B2 – DW "Video-Thema"**: our server reads DW's official podcast feed
  (`https://rss.dw.com/xml/DKpodcast_videothema_de`, cached 12 h, last good copy if DW is down) and shows
  the latest 20 episodes; an episode plays DW's own video file in a `<video>` player, with its text,
  source link and credit. `VIDEO_THEMA_FEED_URL` can point to a local copy of the feed for tests.
- Per user: last position ("كمّل من مكان ما وقفت", via the YouTube IFrame API), "خلّصت" buttons, progress
  per level, and the Gemini link under every video.

## Focus timer ⏱️ and "خزنتي" (v15)

- **100% optional:** the ⏱️ button next to dark mode opens "عايز تركّز قد إيه؟" (15 / 25 🍅 / 45 / custom 5–180 min, an optional goal, celebration sound and a break after). It never starts by itself and never covers a lesson.
- **Quiet while running:** only a thin ring in the level colour fills slowly; tap it for mm:ss, the goal, pause / restart / cancel. The timer is stored as an **end timestamp** in `localStorage` (`gs_focus_timer`), so it survives refresh and navigation, stays exact in background tabs, and syncs between tabs. A hidden tab shows "⏱️ 12:30 – بتذاكر".
- **Never mid-exercise:** if a quiz, a translation/complete exercise or shadowing is open when time runs out, the celebration waits until it's finished (max 2 minutes).
- **"خزنة الإنجاز" 🏆:** a CSS-3D vault door opens, gold coins + confetti fly out (`canvas-confetti`, MIT, loaded only then), and a cha-ching is generated with the Web Audio API (no sound files). Then a card: minutes, a motivating line, "did you reach your goal?", today / streak / total, break or continue. Esc or a click outside closes it. Reduced motion / effects off → a simple fade.
- **Break:** green ring; at the end a soft chime and "الاستراحة خلصت 😊 يلا نكمل؟".
- **Stats per account:** every finished session is saved (`focus_sessions`; minutes are capped by the real elapsed time). "💰 خزنتي" on تقدّمي shows total, today, 7 days, streak 🔥, a 7-day chart and badges (1 h 🥉, 5 h 🥈, 10 h 🥇, 25 h 🏅, 50 h 🏆, 100 h 💎). Focus minutes also show on the level page as study time.
- **Settings:** default length, celebration sound, break on/off and 3 / 5 / 10 minutes; confetti and the 3D vault follow the existing effects setting.
- APIs (login required): `POST /api/focus/sessions`, `PATCH /api/focus/sessions/:id`, `GET /api/focus/stats`.
- The Gemini card no longer shows a QR code; on a laptop it only explains that voice chat works in the Gemini app on the phone.

## Community: study rooms with voice

- **Groups:** a public or private room (2–40 people). A private room has an invite link (`/community/invite/…`);
  friends without an account sign up and land back in the room. Optional join approval, raise hand, shared
  timer, host controls (remove, transfer, end).
- **Chat:** text messages for everyone in the room; the room refreshes every 3 s while visible.
- **Voice 🎙️ (audio only, never the camera):** up to **10 people** talk together, browser to browser (WebRTC
  mesh). The server only keeps who is in the call and passes the connection offers/answers along
  (`/api/community/rooms/:id/voice`); the sound itself never goes through the server. Mute, speaking ring,
  🎙️/🔇 in the member list; leaving the room, being removed or the room ending also ends the voice call.
  Headphones avoid echo.
- **Optional TURN relay:** most networks connect with the built-in STUN servers. If someone on a strict
  network (some mobile carriers, company Wi-Fi) can't hear the others, add a TURN relay:
  `TURN_URLS` (comma-separated `turn:`/`turns:` URLs), `TURN_USERNAME`, `TURN_CREDENTIAL`.

## End of the level pages

After the topics, every level page ends with one band in the level colour: more activities (grammar,
community, Sprachcafé, review, progress, break), trusted official sources (DW, Goethe-Institut model exams,
ÖSD model exams, Österreich Institut) and "who's behind Sprich Deutsch" with the channel.

## Accounts

- **Sign-up:** name, username (unique, lowercase, `a-z 0-9 _`, 3–20 chars), password (≥ 8, bcrypt-hashed,
  never stored or logged in plain text), optional photo (cropped to a circle in the browser → 256×256 WebP).
- **Login:** username + password; "remember me" keeps you logged in for 30 days, otherwise until the
  browser closes. 5 failed tries per username + IP lock that pair for 15 minutes.
- **Sessions:** signed, `httpOnly`, `sameSite=lax`, `secure` cookies (HMAC-SHA256 with `AUTH_SECRET`).
  Changing a password, a reset by the admin or disabling an account logs out every device at once.
- **Every API route checks the session**, and all data (progress, reports, Gemini reports, weaknesses,
  settings) belongs to one user. Other people's reports answer 404.
- **Admin:** the role is stored in `users.role` in the database and re-read on every request; the
  browser never decides it. An account becomes admin at sign-up only if its username is listed in
  `ADMIN_USERNAMES`; without that variable, only the first account of a **local/development** database
  becomes admin. In production an empty database never makes anyone admin automatically. Accounts that are
  already admin stay admin. `/admin` is checked on the server (logged out → login, learners → "admins only",
  the dashboard code is only downloaded after the server confirms an admin), and every `/api/admin/*` route checks the role again
  (401 logged out, 403 learners; `tests/adminSecurity.test.ts` scans all of them). It lists students
  (joined, last activity, past sessions), sets a new temporary password, disables/enables or deletes
  accounts, and manages the site links, vlogs, videos, films, podcasts and Sprachcafé.
- Built so email or Google login can be added later (nullable columns next to `username`).

## Reports and progress

- **Reports** (profile menu → التقارير): the reports you paste from Gemini (tagged "Gemini", text kept as
  written), the practice reports of "اسمع وكرر", and — read-only — the reports of conversations held on
  the site before v11.
- **My progress:** the four skills per level (Sprechen = book sentences said right + a bonus per Gemini
  conversation), the book, Easy German videos watched, a practice streak (days with any practice), and
  the charts and weakness tracker from earlier reports.
- Free writing (with a key) corrects every sentence; its mistakes go into the weakness tracker
  (`src/lib/report/weakness.ts`: new → improving / persisting → resolved).
- All data lives in SQLite via libSQL — a local file in `data/`, or a Turso database when deployed — with
  JSON export/import and "delete all my data" in Settings.

## Known limitations

- Feedback on pronunciation in "اسمع وكرر" compares words only; the browser's speech recognition gives
  text, not phonetic scoring.
- Web Speech recognition only works in Chrome/Edge and sends audio to the browser vendor's service.
- Gemini Live (voice) depends on Google's app, country and account; on a laptop browser Gemini answers in text.
- Browser voices differ per device; pick and preview them in Settings.

## Project structure

```
src/app/              pages (level, topic, review, reports, progress, settings, admin) + API routes
src/components/       AppShell, level skills, book practice, videos, Gemini card, admin…
src/lib/levels.ts     level colours, rules (for AI texts), voice defaults
src/lib/book*.ts      the book: loader, comparison, quiz, writing, progress/review
src/lib/easyGerman.ts Easy German videos (JSON + admin changes)
src/lib/gemini.ts     pasted Gemini reports
src/lib/llm/          optional Anthropic client + JSON retry (reading texts, writing corrections)
src/lib/report/       saved report types, writing corrections, weakness tracker
src/lib/db/           SQLite/libSQL (Drizzle) schema, additive migration and repository
src/lib/auth/         accounts: signed tokens, bcrypt, rate limiting, session helpers
src/lib/client/       browser TTS/STT, i18n (AR/DE/EN), clipboard, API helpers
data/                 the book, Easy German videos, DW video IDs, Gemini prompts
tests/                Vitest
```

---

## بالعربي باختصار

**الفكرة:** موقع تتعلم فيه ألماني من كتابك "Sprich Deutsch" من A1 لحد B2: اسمع وكرر، القواعد، فيديوهات
(Nicos Weg و Video-Thema و Easy German)، قراية وكتابة. **المحادثة كلها مع Gemini** (مجاني): الموقع بيجهّزلك
التعليمات على مستواك وموضوعك وتلزقها في Gemini، وعلى الموبايل تدوس Live 〰️ وتتكلم بصوتك. وتقدر تلزق تقرير
Gemini في "التقارير".

**التشغيل:**

1. `cd german-speaking` وبعدين `npm install`
2. انسخ `.env.example` لـ `.env.local` وحط `AUTH_SECRET` (مفتاح Anthropic اختياري)
3. `npm run dev` وافتح `http://localhost:3000`
4. استخدم **Chrome** أو **Edge** عشان "اسمع وكرر" يشتغل.

**النشر على Vercel:** اعمل Project جديد من نفس الريبو، وخلي الـ Root Directory `german-speaking`، وحط
`AUTH_SECRET`، ووصّل قاعدة بيانات Turso من Storage عشان تقدّمك ميتمسحش، و Blob (اختياري) لصور البروفايل.
أول حساب يتعمل بيبقى هو المسؤول. التفاصيل فوق في قسم "Deploy on Vercel".
