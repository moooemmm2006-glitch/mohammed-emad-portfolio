<div dir="rtl">

# Demo Studio — مولّد نماذج المواقع للـ Cold Calling

قبل ما تكلّم أي بيزنس (سنتر، عيادة، محل)، ابعتله **موقع جاهز باسمه وأرقامه** على لينك زي
`…/demo/english-dose`، واعرف **لحظة ما يفتحه** على تيليجرام.

- `/studio`: الاستوديو (بباسورد): النماذج، الإنشاء، الإرسال، النشاط، الإعدادات.
- `/demo/<slug>`: النموذج العام (noindex، مش في السايت ماب).
- `/s/<slug>`: الموقع الحقيقي بعد ما العميل يوافق.
- البورتفوليو: صفحة `try.html` «جرّب موقع لبيزنسك ✨» فيها النماذج الثلاثة وفورم طلب نموذج مجاني.

---

## ١. اعمل نموذج في ٥ دقايق

1. افتح `/studio` ← **نموذج جديد**.
2. **النوع والستايل**: سنتر / عيادة / متجر، وبعدين Modern Bold أو Calm Premium.
3. **البيانات**: الصق أي كلام عن البيزنس في «لصق سريع» (كارت جوجل ماب، صفحة فيسبوك…) ودوس **املأ الحقول**:
   الاسم والرقم والعنوان والمنطقة والمواعيد بتتملى لوحدها. عدّل اللي محتاج، ودوس **اقترح** لجملة تعريفية.
   أول ما تكتب الاسم، النموذج **بيتحفظ أوتوماتيك** (مسودة).
4. **المحتوى**: الخدمات/المواد، الجدول، المدرسين/الطبيب، ليه تختارنا، الأسئلة: كلها متعبّية بشكل افتراضي.
   امسح أو عدّل أو رتّب بالسحب (أو بالأسهم).
   **متكتبش أسعار أو نتايج مش متأكد منها.**
5. **الهوية**: ارفع اللوجو (بيتقصّ وبنطلّع ألوانه) أو اختار من ٨ باليتات، الخط، فاتح/غامق.
6. **الصور** (اختياري): لحد ٨ صور بتتضغط على جهازك. من غير صور هنستخدم رسومات تجريدية معمولة بالكود.
7. **النشر**: الرابط (من الاسم أوتوماتيك)، المدة (افتراضي ١٤ يوم)، ملاحظة ليك ← **انشر وجهّز للإرسال**.
8. صفحة **ابعت**: انسخ اللينك، أو افتح واتساب برسالة جاهزة، أو نزّل صورة الموكاب أو الـ QR،
   وسكريبت المكالمة قدامك.

**استيراد CSV**: `/studio/import`، بنفس أعمدة شيت الليدز `name, type, area, phone, link, notes`.
بتشوف الصفوف، تختار الستايل لكل نوع، وكلهم بيتعملوا مسودات مرة واحدة.

**المتابعة**: أول ما حد يفتح النموذج، الحالة بتبقى «اتفتح 👀» لوحدها، وبيوصلك:
- رسالة تيليجرام.
- توست في الاستوديو.

صفحة **النشاط** فيها الخط الزمني، والأقسام اللي اتشافت، و«أحسن وقت تكلّمه».
زياراتك إنت (وإنت داخل الاستوديو، أو بـ `?preview=1`) **مش بتتحسب**.

**موقع حقيقي**: من تبويب «موقع حقيقي» ← **حوّله لموقع حقيقي**. بعدها:
- الموقع بيبقى على `/s/<slug>`، من غير شريط النموذج، والفورم شغال بجد.
- تقدر تحط ويب هوك (n8n / Google Sheets).
- تقدر تنزّل نسخة **ZIP** ثابتة.

---

## ٢. متغيرات البيئة

| المتغير | مطلوب؟ | الشرح |
|---|---|---|
| `STUDIO_PASSWORD` | ✅ | باسورد الاستوديو |
| `AUTH_SECRET` | ✅ | سر عشوائي ٣٢+ حرف (توقيع الكوكي وتشفير الزوار). `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TURSO_DATABASE_URL` | ✅ | قاعدة Turso (ممكن نفس اللي عندك: الاستوديو بيعمل جداول `demo_*` بس) |
| `TURSO_AUTH_TOKEN` | ✅ | توكن Turso |
| `BLOB_READ_WRITE_TOKEN` | ✅ للصور | بيتعمل أوتوماتيك لما تضيف Blob Store للمشروع على Vercel |
| `NEXT_PUBLIC_SITE_URL` | ✅ | الدومين اللي اللينكات بتتبعت منه، مثلاً `https://mohammed-emad-portfolio.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | اختياري | توكن البوت |
| `TELEGRAM_CHAT_ID` | اختياري | الشات اللي التنبيهات توصله |
| `CUSTOM_DOMAINS` | اختياري | دومينات العملاء: `englishdose.com=english-dose,www.englishdose.com=english-dose` |

كلهم مكتوبين في `.env.example`. محليًا من غير Turso، البيانات بتتحفظ في `data/demo-studio.db`، وباسورد التطوير هو `studio`.

---

## ٣. النشر على Vercel

1. Vercel ← **Add New Project** ← نفس الريبو، وخلي **Root Directory = `demo-studio`**، واسم المشروع **`me-demo-studio`**.
2. ضيف متغيرات البيئة اللي فوق، وضيف **Storage ← Blob** للمشروع.
3. Deploy. الاستوديو هيبقى على `https://me-demo-studio.vercel.app/studio`.
4. **نفس الدومين (ثقة أكتر)**: `vercel.json` في البورتفوليو بيعمل rewrite لـ `/demo`، `/s`، `/studio`، `/api`، `/_next` على `https://me-demo-studio.vercel.app`.
   - النتيجة: اللينك اللي بتبعته بيبقى `https://mohammed-emad-portfolio.vercel.app/demo/english-dose`.
   - لو اسم المشروع طلع مختلف، غيّر الرابط في `vercel.json` (٦ سطور).
   - وخلي `NEXT_PUBLIC_SITE_URL` = دومين البورتفوليو.

---

## ٤. بوت تيليجرام خطوة بخطوة

1. افتح تيليجرام ودوّر على **@BotFather** ← `/newbot` ← اختار اسم (مثلاً *Demo Alerts*) واسم مستخدم ينتهي بـ `bot`.
2. BotFather هيبعتلك **توكن** شكله `123456789:AA…`. ده `TELEGRAM_BOT_TOKEN`.
3. افتح البوت بتاعك ودوس **Start**، وابعتله أي رسالة.
4. افتح في المتصفح: `https://api.telegram.org/bot<TOKEN>/getUpdates`، ودوّر على `"chat":{"id":123456789`. الرقم ده هو `TELEGRAM_CHAT_ID`.
5. حط المتغيرين في Vercel ← Redeploy ← `/studio/settings` ← **ابعت رسالة تجربة**.

التنبيهات بتوصل في الحالات دي (رسالة واحدة لكل نموذج كل ٣٠ دقيقة لكل نوع):
- أول فتح للنموذج.
- رجوع العميل للنموذج.
- لما يدوس «كلّمني».
- طلب جديد من البورتفوليو.

---

## ٥. دومين خاص لعميل

1. Vercel ← مشروع `me-demo-studio` ← Settings ← Domains ← Add ← `englishdose.com` (و `www.englishdose.com`).
2. عند شركة الدومين:
   - `A @ 76.76.21.21`
   - `CNAME www cname.vercel-dns.com`
3. ضيف في `CUSTOM_DOMAINS`: `englishdose.com=english-dose,www.englishdose.com=english-dose`، واعمل Redeploy.
4. لازم الموقع يكون «موقع حقيقي» (اتحوّل من تبويب موقع حقيقي).

---

## ٦. إضافة نوع بيزنس (Niche) جديد

1. `src/lib/demo/model.ts`: ضيف النوع في `NICHES`، و`NICHE_LABEL`، و`NICHE_SHORT`.
2. `src/lib/demo/niches.ts`: اعمل `NicheBank` جديد، وضيفه لـ `BANKS` و`DEFAULT_SERVICES` و`DEFAULT_PEOPLE`. البنك فيه:
   - جمل تعريفية، و«ليه تختارنا»، وأسئلة، وأزرار: ٣–٥ نسخ لكل خانة.
   - سكريبت المكالمة.
3. `src/templates/Art.tsx`: رسمة تجريدية للنوع.
4. `src/templates/Template.tsx`: ترتيب الأقسام في `LAYOUTS` لكل ستايل.
   - لو محتاج قسم جديد: اعمله في `sections.tsx` وضيفه لـ `RENDER`.
5. `src/lib/quickPaste.ts` (`guessNiche`): كلمات تعرّف النوع من اللصق السريع ومن الـ CSV.
6. شغّل الاختبارات: `npm test`.

---

## ٧. الأوامر

```bash
npm install
npm run dev          # http://localhost:3100/studio  (باسورد التطوير: studio)
npm test             # Vitest
npm run test:e2e     # Playwright smoke (بيستخدم قاعدة مؤقتة data/e2e.db)
npm run build
```

</div>

---

## English summary

**Demo Studio** generates a personalised demo website for a business before a cold call, then tracks when it's opened.

- **Stack**: Next.js 15 App Router + TypeScript + Tailwind 4, Turso/libSQL + Drizzle (`demo_*` tables only), Vercel Blob, framer-motion, zod.
- **Studio** (`/studio`, password, signed httpOnly cookie, DB-backed login rate limit, `noindex`):
  - Dashboard with stats, filters and the status pipeline.
  - 6-step editor with autosave and a live phone/desktop preview.
  - Quick paste parser, CSV bulk import, share kit, activity timeline, settings.
- **Templates**: one content model → 3 niches (courses center, clinic, shop) × 2 styles (Modern Bold, Calm Premium).
  - The styles differ in layout, typography and section order.
  - Copy comes from a seeded Egyptian-Arabic phrase bank.
  - Sample testimonials and results are always labelled «مثال».
- **Public demo** `/demo/[slug]`:
  - `noindex`, with a demo bar and countdown.
  - Demo-mode modal for forms and business CTAs.
  - Expired page; `?frame=phone`.
- **Share images**: Open Graph and phone mockup PNGs are rendered **SVG → PNG with resvg**. `next/og` (Satori) reverses Arabic word order, so it isn't used.
- **Tracking** (`/api/t`), no cookies or third parties:
  - Unique visitor = HMAC(IP + UA + Cairo day). The raw IP is never stored.
  - Records duration, scroll depth, sections seen and CTA clicks.
  - Studio sessions and `?preview=1` are excluded.
  - Telegram alerts are throttled to one per demo per 30 minutes.
- **Real site** `/s/[slug]`:
  - Indexable and in the sitemap.
  - Real forms: stored in the DB, sent to WhatsApp, plus an optional webhook.
  - Static ZIP export.
  - Custom domains via `CUSTOM_DOMAINS`.
- **Portfolio**: `try.html` plus nav/hero/footer links. `vercel.json` rewrites the Demo Studio paths onto the portfolio domain, and the strict CSP is scoped to the static pages.

### Deploy
1. Create a Vercel project from this repo with Root Directory `demo-studio`, named `me-demo-studio`.
2. Add the env vars above and a Blob store.
3. If the project URL differs, update the six rewrite destinations in the root `vercel.json`.

### Lighthouse (mobile, local production build)

| Page | Perf | A11y | Best practices | SEO |
|---|---|---|---|---|
| `/s/sample-clinic` | 94 | 100 | 100 | 100 |
| `/demo/*` | 91–95 | 100 | 100 | 63 |

- The demo pages' SEO score is capped **only** by the required `noindex`.
- Arabic fonts use `font-display: optional` without preload, so there is zero layout shift. On a slow first visit, the system Arabic font is shown until the brand font is cached.
