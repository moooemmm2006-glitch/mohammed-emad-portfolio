'use strict';
// Turns API / network errors into plain Egyptian-Arabic reasons + what to do.
// Codes listed here come from the official docs (Meta Graph API error codes,
// Reels Publishing API error table, TikTok Content Posting error tables,
// YouTube Data API errors, Cloudinary upload API). Anything unknown falls
// back to the platform's own message so nothing is hidden.

class PublishError extends Error {
  /** code: our internal code, ar: Arabic reason, fix: what to do */
  constructor(code, ar, fix, details) {
    super(ar);
    this.name = 'PublishError';
    this.code = code;
    this.ar = ar;
    this.fix = fix || '';
    this.details = details;
  }
}

const README = 'README.md';

function metaError(body) {
  const e = (body && body.error) || {};
  return { code: Number(e.code), subcode: Number(e.error_subcode), message: e.error_user_msg || e.message || '', type: e.type };
}

function mapMeta(err, platformAr, tokenEnv) {
  const m = metaError(err.body);
  const tok = tokenEnv ? ' (المتغير ' + tokenEnv + ' في ملف .env)' : '';
  if (m.code === 190 || err.status === 401)
    return ['التوكن خلص أو اتلغى' + tok + '.', 'جدّده من Graph API Explorer بالخطوات اللي في ' + README + ' (جزء Meta: "توكن الصفحة")، حطه في .env وشغّل stop.bat ثم start.bat.'];
  if (m.code === 10 || (m.code >= 200 && m.code <= 299))
    return ['التطبيق ناقصه صلاحية على ' + platformAr + ': ' + m.message, 'اعمل توكن جديد وانت مختار الصلاحيات كلها اللي في ' + README + ' (pages_manage_posts, instagram_content_publish …).'];
  if ([4, 17, 32, 613].includes(m.code))
    return ['وصلت لحد عدد الطلبات المسموح من ميتا.', 'استنى ساعة وجرب تاني.'];
  if (m.code === 368) return ['ميتا قافلة النشر مؤقتًا على الحساب ده (حماية من السبام).', 'افتح الصفحة من فيسبوك وشوف التنبيهات، واستنى قبل ما تجرب تاني.'];
  if (m.code === 1363040) return ['أبعاد الفيديو مش مقبولة في فيسبوك (لازم بين 16:9 و 9:16).', 'صدّر الفيديو 1080x1920.'];
  if (m.code === 1363127) return ['جودة الفيديو قليلة (أقل حاجة 540x960).', 'صدّر الفيديو 1080x1920.'];
  if (m.code === 1363128) return ['مدة الفيديو مش مقبولة (ريلز فيسبوك من 3 لـ 90 ثانية).', 'قصّر الفيديو لـ 90 ثانية أو أقل.'];
  if (m.code === 1363129) return ['عدد الفريمات مش مقبول (من 24 لـ 60).', 'صدّر الفيديو 30 fps.'];
  if (m.code === 100) return ['ميتا رفضت الطلب: ' + m.message, 'اتأكد إن الـ ID في accounts.json صح وإن التوكن بتاع نفس الصفحة.'];
  if (m.message) return ['ميتا رجّعت خطأ: ' + m.message + (m.code ? ' (كود ' + m.code + ')' : ''), 'لو المشكلة اتكررت دوّر على الكود في صفحة Graph API Error Codes.'];
  return null;
}

const TIKTOK = {
  access_token_invalid: ['ربط تيك توك خلص.', 'افتح فورم "ربط تيك توك" واربط الحساب تاني.'],
  scope_not_authorized: ['تيك توك مش مدّي التطبيق صلاحية video.publish.', 'فعّل Direct Post و video.publish في التطبيق، واربط الحساب تاني من فورم "ربط تيك توك".'],
  spam_risk_too_many_posts: ['وصلت لحد النشر اليومي في تيك توك.', 'جرب بكرة.'],
  spam_risk_user_banned_from_posting: ['تيك توك مانع الحساب من النشر.', 'افتح التطبيق وشوف التنبيهات.'],
  reached_active_user_cap: ['التطبيق وصل لحد المستخدمين اليومي (التطبيق غير المراجَع حده 5 حسابات).', 'جرب بكرة.'],
  unaudited_client_can_only_post_to_private_accounts: ['التطبيق لسه ماعداش مراجعة تيك توك، فبينشر بس على حسابات Private.', 'حوّل حساب تيك توك لـ Private من الإعدادات وجرب تاني (شوف ' + README + ').'],
  privacy_level_option_mismatch: ['مستوى الخصوصية في accounts.json مش متاح لحسابك.', 'خلّي tiktok.privacyLevel = "SELF_ONLY".'],
  url_ownership_unverified: ['تيك توك طالب توثيق الدومين.', 'إحنا بنرفع الملف مباشرة؛ لو ظهر الخطأ ده بلّغ عنه.'],
  rate_limit_exceeded: ['طلبات كتير ورا بعض لتيك توك.', 'استنى دقيقة وجرب تاني.'],
  invalid_param: ['تيك توك رفض الطلب.', 'شوف تفاصيل الخطأ في ملف اللوج.'],
  file_format_check_failed: ['تيك توك رفض نوع الملف.', 'صدّر الفيديو MP4 (H.264).'],
  duration_check_failed: ['مدة الفيديو مش مقبولة في تيك توك.', 'قصّر الفيديو.'],
  frame_rate_check_failed: ['عدد الفريمات مش مقبول في تيك توك (23–60).', 'صدّر الفيديو 30 fps.'],
  picture_size_check_failed: ['أبعاد الفيديو مش مقبولة في تيك توك (360–4096 بكسل).', 'صدّر الفيديو 1080x1920.'],
  internal: ['تيك توك عنده مشكلة مؤقتة.', 'جرب تاني بعد شوية.'],
};

function mapTikTok(err) {
  const body = err.body || {};
  const code = (body.error && body.error.code) || body.error || err.tiktokCode;
  if (code && TIKTOK[code]) return TIKTOK[code];
  if (err.status === 401) return TIKTOK.access_token_invalid;
  if (code === 'invalid_grant') return ['ربط تيك توك خلص (الـ refresh token انتهى أو اتغير).', 'افتح فورم "ربط تيك توك" واربط الحساب تاني.'];
  const msg = (body.error && body.error.message) || body.error_description || body.message;
  if (msg) return ['تيك توك رجّع خطأ: ' + msg + (code ? ' (' + code + ')' : ''), 'شوف تفاصيل الخطأ في ملف اللوج.'];
  return null;
}

function mapYouTube(err) {
  const body = err.body || {};
  const e = body.error || {};
  const reason = (e.errors && e.errors[0] && e.errors[0].reason) || e.status || '';
  if (err.nodeError && /credential/i.test(e.message || ''))
    return ['n8n مش لاقي حساب يوتيوب (YouTube credential).', 'افتح الـ workflow في n8n، وفي نودين "يوتيوب: بدء الرفع" و "يوتيوب: رفع الفيديو" اختار YouTube account، واعمل Publish.'];
  if (err.nodeError) return ['n8n ماقدرش يكلم يوتيوب: ' + e.message, 'افتح n8n ← Executions وشوف التفاصيل.'];
  if (err.status === 401 || reason === 'authError' || reason === 'UNAUTHENTICATED')
    return ['ربط يوتيوب في n8n خلص (التوكن مش صالح).', 'افتح n8n ← Credentials ← YouTube account ← Reconnect. لو التطبيق في وضع Testing بيخلص كل 7 أيام (شوف ' + README + ').'];
  if (reason === 'quotaExceeded' || reason === 'uploadLimitExceeded' || reason === 'rateLimitExceeded')
    return ['خلصت حصة يوتيوب اليومية للرفع.', 'الحصة بتتجدد 12 بالليل بتوقيت كاليفورنيا (حوالي 10 الصبح بتوقيت مصر). جرب بعدها.'];
  if (reason === 'invalidTitle') return ['يوتيوب رفض العنوان.', 'اكتب عنوان أقل من 100 حرف ومن غير < أو >.'];
  if (reason === 'invalidDescription') return ['يوتيوب رفض الوصف.', 'قصّر الكابشن وشيل < و >.'];
  if (reason === 'forbidden' || err.status === 403)
    return ['يوتيوب رافض الرفع: ' + (e.message || reason), 'اتأكد إن YouTube Data API v3 متفعّل وإن حسابك عنده قناة.'];
  if (e.message) return ['يوتيوب رجّع خطأ: ' + e.message, 'شوف تفاصيل الخطأ في ملف اللوج.'];
  return null;
}

function mapCloudinary(err) {
  const msg = (err.body && err.body.error && err.body.error.message) || '';
  if (err.status === 401 || /signature|api_key|api key/i.test(msg))
    return ['بيانات Cloudinary غلط (' + msg + ').', 'راجع CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET في .env.'];
  if (/too large|size/i.test(msg) || err.status === 413)
    return ['الفيديو أكبر من الحد المسموح في خطة Cloudinary المجانية (' + msg + ').', 'قلّل حجم الفيديو أو شوف الحد في Cloudinary Console ← Settings.'];
  if (msg) return ['Cloudinary رجّع خطأ: ' + msg, 'إنستجرام محتاج Cloudinary يشتغل عشان ياخد الفيديو.'];
  return null;
}

/** Map any error to {ar, fix, code, raw}. */
function mapError(platform, err, ctx) {
  ctx = ctx || {};
  if (err instanceof PublishError || (err && err.name === 'PublishError')) return { ar: err.ar, fix: err.fix, code: err.code, raw: err.details };
  let pair = null;
  if (err && ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'NETWORK'].includes(err.code)) {
    pair = err.code === 'ETIMEDOUT'
      ? ['الطلب أخد وقت طويل ومفيش رد.', 'اتأكد إن النت شغال وجرب تاني.']
      : ['مش قادر أوصل للسيرفر (' + err.code + ').', 'اتأكد إن النت شغال على اللابتوب وجرب تاني.'];
  } else if (err && (err.status !== undefined || err.nodeError)) {
    if (platform === 'facebook') pair = mapMeta(err, 'صفحة الفيسبوك', ctx.tokenEnv);
    else if (platform === 'instagram') pair = mapMeta(err, 'حساب إنستجرام', ctx.tokenEnv);
    else if (platform === 'tiktok') pair = mapTikTok(err);
    else if (platform === 'youtube') pair = mapYouTube(err);
    else if (platform === 'cloudinary') pair = mapCloudinary(err);
    if (!pair && err.status >= 500) pair = ['السيرفر عنده مشكلة مؤقتة (' + err.status + ').', 'جرب تاني بعد شوية.'];
  }
  if (!pair) pair = ['حصل خطأ غير متوقع: ' + ((err && err.message) || String(err)), 'شوف ملف اللوج في logs/ وتفاصيل التنفيذ في n8n ← Executions.'];
  return { ar: pair[0], fix: pair[1], code: (err && err.code) || 'UNKNOWN', raw: err && err.body };
}

module.exports = { PublishError, mapError, TIKTOK };
