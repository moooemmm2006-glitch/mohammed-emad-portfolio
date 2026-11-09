// Code node "خطة النشر": page-2 answers -> one item per destination.
const pipeline = lib('pipeline');
const { esc } = lib('results');
const prepNode = $('تجهيز').first().json;
const page2 = $input.first().json;
const out = pipeline.plan(Object.assign({}, prepNode.prep, { page2, nowMs: Date.now() }));

if (out.error) {
  try { require('fs').unlinkSync(prepNode.run.filePath); } catch (e) {}
  return [{ json: { planError: true, errorHtml: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مشكلة</title><style>body{font-family:system-ui,Tahoma,sans-serif;background:#f6f7f9;padding:24px}.c{max-width:640px;margin:auto;background:#fff;border-radius:12px;padding:24px;line-height:1.8}a{color:#1259c3}</style></head><body><div class="c"><h2>❌ ' + esc(out.error) + '</h2><a href="/form/publish">ابدأ من الأول</a></div></body></html>' } }];
}
const run = Object.assign({}, prepNode.run, { scheduledFor: out.schedule.scheduled ? out.schedule.iso : null });
const scheduledHtml = out.schedule.scheduled
  ? '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>اتجدول</title><style>body{font-family:system-ui,Tahoma,sans-serif;background:#f6f7f9;padding:24px}.c{max-width:640px;margin:auto;background:#fff;border-radius:12px;padding:24px;line-height:1.8}</style></head><body><div class="c"><h2>🕒 اتجدول</h2><p>هيتنشر يوم ' + esc(out.schedule.display) + ' على ' + out.items.length + ' مكان.</p><p><b>سيب n8n شغال (ماتقفلش stop.bat)</b> لحد الميعاد. لو قفلته، هيتنشر أول ما تشغله تاني.</p><p>النتيجة هتتكتب في logs/ وهتوصلك على تيليجرام لو مفعّل.</p></div></body></html>'
  : '';
return out.items.map((d) => ({ json: Object.assign(d, { run, settings: prepNode.prep.config.settings, schedule: out.schedule, scheduledHtml }) }));
