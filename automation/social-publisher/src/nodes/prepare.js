// Code node "تجهيز": read accounts.json, probe the saved video, build page 2.
const fs = require('fs');
const pipeline = lib('pipeline');
const { probeFile } = lib('video');
const { esc } = lib('results');

const P = '/files/project';
const form = $('انشر الفيديو').first().json;
const bin = $('انشر الفيديو').first().binary || {};
const meta = bin.video || {};
const saved = $input.first().json; // output of "حفظ الفيديو"
const filePath = saved.fileName && saved.fileName.startsWith('/') ? saved.fileName : P + '/data/uploads/' + saved.fileName;
const dryRun = String($env.DRY_RUN || '').toLowerCase() === 'true';

let fatal = null;
let configText = null;
try {
  configText = fs.readFileSync(P + '/accounts.json', 'utf8');
} catch (e) {
  fatal = 'ملف accounts.json مش موجود جنب docker-compose.yml. انسخ accounts.example.json باسم accounts.json وعدّل فيه صفحاتك.';
}

let videoInfo = null;
let fileSize = 0;
if (!fatal) {
  try {
    fileSize = fs.statSync(filePath).size;
    videoInfo = probeFile(filePath);
  } catch (e) {
    fatal = 'مش قادر أقرا الفيديو اللي اترفع: ' + esc(e.message);
  }
}

let prep = {};
if (!fatal) {
  prep = pipeline.prepare({ configText, videoInfo, form, dryRun });
  fatal = prep.fatal || null;
}
if (fatal) {
  try { fs.unlinkSync(filePath); } catch (e) {}
}

return [{
  json: {
    fatal: !!fatal,
    errorHtml: fatal ? errorPage(fatal) : '',
    formFields: prep.formFields || [],
    prep: { config: prep.config, captions: prep.captions, checks: prep.checks },
    run: {
      runId: String($execution.id),
      startedAt: Date.now(),
      dryRun,
      filePath,
      fileSize,
      fileName: meta.fileName || 'video.mp4',
      mimeType: meta.mimeType || 'video/mp4',
      videoInfo,
      caption: form.caption || '',
      hashtags: form.hashtags || '',
      title: form.title || '',
    },
  },
}];

function errorPage(msg) {
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مشكلة</title><style>body{font-family:system-ui,Tahoma,sans-serif;background:#f6f7f9;padding:24px}.c{max-width:640px;margin:auto;background:#fff;border-radius:12px;padding:24px;line-height:1.8}a{color:#1259c3}</style></head><body><div class="c"><h2>❌ ماينفعش نكمل</h2><p>' + msg + '</p><a href="/form/publish">ارجع للفورم</a></div></body></html>';
}
