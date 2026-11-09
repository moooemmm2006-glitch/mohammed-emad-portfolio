// Code node "تيك توك: حفظ الربط"
const tiktok = lib('tiktok');
const { mapError } = lib('errors');
const { esc } = lib('results');
const start = $('تيك توك: رابط الربط').first().json;
const got = tiktok.parseCallbackUrl($json.callbackUrl);
let title, msg;
try {
  if (got.error) throw Object.assign(new Error(got.error_description || got.error), { name: 'x' });
  if (!got.code) throw new Error('الرابط مافيهوش code. انسخ الرابط كله من شريط العنوان بعد ما توافق.');
  if (got.state !== start.state) throw new Error('الرابط ده من محاولة ربط قديمة (state مختلف). ابدأ من الأول.');
  require('fs').mkdirSync('/files/project/data', { recursive: true });
  const t = await tiktok.exchangeCode({ env: $env, tokenPath: '/files/project/data/tiktok-token.json', code: got.code, redirectUri: $env.TIKTOK_REDIRECT_URI });
  title = '✅ تيك توك اتربط';
  msg = 'الصلاحيات: ' + esc(t.scope) + '<br>' + (String(t.scope).includes('video.publish') ? 'جاهز للنشر.' : '⚠️ صلاحية video.publish مش موجودة — فعّل Direct Post في التطبيق واربط تاني.');
} catch (e) {
  const m = e.ar ? mapError('tiktok', e) : { ar: e.message, fix: '' };
  title = '❌ الربط مانجحش';
  msg = esc(m.ar) + (m.fix ? '<br>' + esc(m.fix) : '');
}
return [{ json: { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تيك توك</title><style>body{font-family:system-ui,Tahoma,sans-serif;background:#f6f7f9;padding:24px}.c{max-width:640px;margin:auto;background:#fff;border-radius:12px;padding:24px;line-height:1.8}a{color:#1259c3}</style></head><body><div class="c"><h2>' + title + '</h2><p>' + msg + '</p><a href="/form/publish">روح لفورم النشر</a></div></body></html>' } }];
