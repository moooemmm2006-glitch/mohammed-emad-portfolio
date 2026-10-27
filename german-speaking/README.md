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
- **Browsers:** use **Chrome or Edge** (desktop or Android) for speech recognition. Safari/Firefox can
  still speak the partner's voice; type your answers in the text box, or enable the Whisper provider
  (below), which works in any browser with `MediaRecorder`.

Other commands: `npm run build` · `npm start` · `npm test` · `npm run lint` · `npm run typecheck`.

## Deploy on Vercel (to use it on your phone)

1. In Vercel: **Add New… → Project → Import** this GitHub repository.
2. **Root Directory:** `german-speaking` (framework is detected as Next.js; keep the defaults).
3. **Environment Variables:** `ANTHROPIC_API_KEY` and **`APP_PASSWORD`** (the site is public, so the
   password stops other people from using your API key or seeing your data).
4. **Storage → Turso (Marketplace) → Create database → connect it to this project.** This adds
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Without it the app still runs, but Vercel's disk is
   temporary, so sessions and reports can disappear (the home page shows a warning).
5. **Deploy**, open the URL in Chrome on Android/desktop (HTTPS is needed for the microphone), log in with
   the password, and allow microphone access.

Every push to the connected branch redeploys automatically.

## Configuration (`.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Claude API key (server only; never sent to the browser) |
| `ANTHROPIC_CHAT_MODEL` | `claude-haiku-5-5` | Fast model for conversation turns |
| `ANTHROPIC_CHECK_MODEL` | `claude-haiku-5-5` | Level checker, hints, context summaries |
| `ANTHROPIC_REPORT_MODEL` | `claude-opus-5-5` | Post-conversation report |
| `LLM_PROVIDER=mock` | – | Force demo mode even with a key |
| `TTS_PROVIDER` | `webspeech` | `webspeech` · `openai` · `elevenlabs` |
| `OPENAI_API_KEY` | – | For OpenAI TTS and Whisper STT |
| `OPENAI_TTS_VOICE_A1…B2` | nova/echo/shimmer/onyx | One voice per level |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_A1…B2` | – | ElevenLabs, one voice ID per level |
| `STT_PROVIDER` | `webspeech` | `webspeech` · `openai` (Whisper) |
| `DATABASE_PATH` | `./data/german-speaking.db` | Local SQLite file |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | – | Hosted libSQL database (used instead of the file when set) |
| `APP_PASSWORD` | – | Password page for public deployments |
| `LOG_LEVEL_VIOLATIONS=1` | on in dev | Print level-checker violations to the console |

If a premium provider is selected but its key is missing, the app silently falls back to the browser
(Web Speech API). In **Settings** you can also choose per device: automatic / browser / server.

## How the level lock works

The rule "the partner never speaks above its level" is enforced in code, not only in a prompt
(`src/lib/levelLock/`):

1. **Per-level system prompt** (`src/lib/prompts.ts`, `src/lib/levels.ts`): allowed and forbidden grammar,
   vocabulary range, max words per sentence and sentences per turn, few-shot allowed/forbidden
   sentences, "answer at YOUR level even if the learner is above/below it", talk less and always end with
   a question, German only. The greeting follows the same rules.
2. **Heuristic pre-check** on every draft: sentence length/count, over-long compounds, and regexes for
   structures that are above the level (e.g. Konjunktiv II, Passiv, relative clauses and Nebensätze at A1;
   Konjunktiv I or extended participle phrases at B1). A failing draft is regenerated without spending a
   checker call.
3. **Second-pass LLM checker** (fast model, structured JSON validated with zod): if it finds something
   above the level, the reply is **regenerated with the violations fed back** (max 2 retries).
4. **Fallbacks**: the checker's simplified version → an explicit "simplify" call → the sentences that
   pass on their own → a canned level-safe line.
5. Violations are logged to the `violation_log` table (and to the console in development).

Settings → *Level checking*: **strict** (default; checks before speaking) or **fast** (streams and
speaks sentence by sentence immediately, checks afterwards, and steers the next turn if it went
above the level).

The "مش فاهم / I'm stuck" button gives the meaning and a tip in Arabic or English, plus a simpler German
rephrase that is checked against the level as well.

## Reports, memory and progress

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
- Barge-in (interrupting the partner) works in hands-free mode with Web Speech recognition; it uses an
  echo filter, so with loud speakers it can occasionally be triggered by the partner's own voice.
  Headphones work best; it can be switched off in Settings.
- Browser voices differ per device; pick and preview them in Settings.

## Project structure

```
src/app/            pages (home, speak, conversation, reports, progress, settings, coming soon) + API routes
src/components/     AppShell, Conversation, Avatar (SVG personas), MicCheck, LevelCard…
src/lib/levels.ts   personas, level rules, few-shot examples, topics, tags
src/lib/levelLock/  heuristic checker + regenerate/fallback wrapper
src/lib/llm/        Anthropic client, offline mock, JSON retry
src/lib/report/     report schema, generation, mock report, weakness tracker
src/lib/db/         SQLite/libSQL (Drizzle) schema and repository
src/lib/client/     browser TTS/STT providers, i18n (AR/EN), API helpers
tests/              Vitest: level lock, report schema, tracker, full mocked flow
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
`german-speaking`، وحط `ANTHROPIC_API_KEY` و `APP_PASSWORD`، ووصّل قاعدة بيانات Turso من Storage عشان
جلساتك متتمسحش. التفاصيل فوق في قسم "Deploy on Vercel".

**تنبيه:** ملاحظات النطق استرشادية بس، مش تقييم معتمد.
