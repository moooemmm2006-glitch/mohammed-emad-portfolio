# ✅ Checklist الإعداد (صفحة واحدة)

اطبعها أو علّم عليها هنا `[x]`. التفاصيل في [README.md](README.md).

## مرة واحدة — الأساس (حوالي 20 دقيقة)
- [ ] Docker Desktop متسطب وبيكتب **Engine running**
- [ ] `.env` اتعمل من `.env.example`
- [ ] `N8N_ENCRYPTION_KEY` اتعمل **واتحفظ منه نسخة** (ماتغيرهوش أبدًا)
- [ ] `accounts.json` اتعمل من `accounts.example.json`
- [ ] `start.bat` اشتغل وفتح n8n
- [ ] حساب الـ owner في n8n اتعمل
- [ ] `import-workflow.bat` اشتغل (أو Import from File + Publish)
- [ ] تجربة بـ `DRY_RUN=true`: الفورم فتح، صفحة الاختيار ظهرت فيها صفحاتك، والنتيجة طلعت

## Meta — فيسبوك + إنستجرام (حوالي 30–45 دقيقة)
- [ ] كل حساب إنستجرام **Professional** و**مربوط بصفحة**
- [ ] تطبيق Business على developers.facebook.com + Facebook Login for Business + Instagram
- [ ] توكن من Graph API Explorer بالصلاحيات: `pages_show_list` `pages_read_engagement` `pages_manage_posts` `instagram_basic` `instagram_content_publish` (+ `business_management` لو محتاج)
- [ ] اتحوّل لتوكن طويل (`oauth/access_token?grant_type=fb_exchange_token…`)
- [ ] `me/accounts?fields=id,name,access_token,instagram_business_account{id,username}` ← pageId + توكن الصفحة + igUserId
- [ ] كل توكن صفحة في Access Token Debugger بيقول **Expires: Never**
- [ ] التوكنات في `.env` (`FB_TOKEN_PAGE_1` …) و `tokenEnv` في `accounts.json`
- [ ] بعد أول نشر حقيقي: البوست ظاهر من حساب **مالوش دور** على التطبيق (لو لأ ← خلّي التطبيق **Live**)

## Cloudinary (حوالي 5 دقايق) — مطلوب لإنستجرام
- [ ] حساب مجاني
- [ ] `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` في `.env`

## YouTube (حوالي 20 دقيقة)
- [ ] Google Cloud project + **YouTube Data API v3** Enabled
- [ ] OAuth consent screen: **External** + إيميلك في Test users
- [ ] OAuth client (Web) بـ redirect `http://localhost:5678/rest/oauth2-credential/callback`
- [ ] n8n ← Credentials ← **YouTube OAuth2 API** ← Sign in
- [ ] الـ credential متختار في «يوتيوب: بدء الرفع» و «يوتيوب: رفع الفيديو» + Publish
- [ ] قررت: Reconnect كل 7 أيام **أو** Publish app (In production)

## TikTok (حوالي 30 دقيقة + انتظار مراجعة التطبيق)
- [ ] تطبيق على developers.tiktok.com + **Login Kit** + **Content Posting API (Direct Post)**
- [ ] Scopes: `user.info.basic`, `video.publish`
- [ ] Redirect URI **https** (موقعك) في Login Kit = `TIKTOK_REDIRECT_URI` في `.env`
- [ ] `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` في `.env`
- [ ] حساب تيك توك **Private** (لازم قبل الـ audit)
- [ ] `http://localhost:5678/form/tiktok-connect` ← اتربط ✅
- [ ] (اختياري) قدّمت على الـ audit، وعارف إنه غالبًا هيترفض لأداة شخصية

## Telegram (اختياري، 5 دقايق)
- [ ] بوت من @BotFather ← `TELEGRAM_BOT_TOKEN`
- [ ] `TELEGRAM_CHAT_ID` من `getUpdates`

## قبل أول نشر حقيقي
- [ ] `DRY_RUN=false` في `.env` ← `stop.bat` ← `start.bat`
- [ ] نشرت فيديو تجربة على صفحة واحدة الأول
- [ ] اتأكدت إن `logs/YYYY-MM.jsonl` بيتكتب

## كل يوم
1. `start.bat`
2. <http://localhost:5678/form/publish>
3. ارفع + كابشن + علّم ← انشر
4. اقرا النتيجة ← `stop.bat`
