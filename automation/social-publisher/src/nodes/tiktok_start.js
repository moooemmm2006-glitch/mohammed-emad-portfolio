// Code node "تيك توك: رابط الربط"
const tiktok = lib('tiktok');
const { esc } = lib('results');
const key = $env.TIKTOK_CLIENT_KEY;
const redirect = $env.TIKTOK_REDIRECT_URI;
if (!key || !$env.TIKTOK_CLIENT_SECRET || !redirect) {
  return [{ json: { error: true, html: page('❌ ناقص بيانات', 'لازم تحط TIKTOK_CLIENT_KEY و TIKTOK_CLIENT_SECRET و TIKTOK_REDIRECT_URI في .env وتشغّل stop.bat ثم start.bat (README: TikTok).') } }];
}
const state = tiktok.newState();
const url = tiktok.buildAuthorizeUrl({ clientKey: key, redirectUri: redirect, state });
const html = '<div dir="rtl" style="text-align:right;line-height:1.9"><p>1) افتح الرابط ده ووافق: <a href="' + esc(url) + '" target="_blank" rel="noopener"><b>اربط حساب تيك توك</b></a></p><p>2) تيك توك هيوديك على ' + esc(redirect) + ' (عادي لو الصفحة فاضية أو 404).</p><p>3) انسخ الرابط كله من شريط العنوان والصقه تحت. الكود بيخلص بسرعة، فاعملها على طول.</p></div>';
return [{ json: { error: false, state, formFields: [{ fieldType: 'html', elementName: 'help', html }, { fieldLabel: 'الرابط اللي وصلت له', fieldName: 'callbackUrl', fieldType: 'text', placeholder: redirect + '?code=...&state=...', requiredField: true }] } }];

function page(t, m) {
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تيك توك</title><style>body{font-family:system-ui,Tahoma,sans-serif;background:#f6f7f9;padding:24px}.c{max-width:640px;margin:auto;background:#fff;border-radius:12px;padding:24px;line-height:1.8}</style></head><body><div class="c"><h2>' + t + '</h2><p>' + m + '</p></div></body></html>';
}
