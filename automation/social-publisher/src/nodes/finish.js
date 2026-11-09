// Code node "النتيجة": cleanup, log, Telegram, result page.
const fs = require('fs');
const cloud = lib('cloudinary');
const results = lib('results');
const { cairoMonth, fmtCairo } = lib('schedule');
const { describe } = lib('video');

const all = $input.all().map((i) => i.json);
const run = all[0].run;
const settings = all[0].settings || {};
const notes = [];

// Cloudinary copy: delete unless keepCloudCopy=true
const ids = [...new Set(all.map((d) => d.cloud && d.cloud.publicId).filter(Boolean))];
if (!settings.keepCloudCopy && !run.dryRun) {
  for (const publicId of ids) {
    try { await cloud.destroyVideo({ env: $env, publicId }); } catch (e) { notes.push('ماقدرتش أمسح النسخة من Cloudinary (' + publicId + '): ' + e.message); }
  }
}
try { fs.unlinkSync(run.filePath); } catch (e) {}

const list = all.map((d) => ({ label: d.label, platform: d.platform, status: d.status === 'ok' ? 'ok' : 'error', link: d.link, note: d.note, errorAr: d.errorAr || (d.status === 'pending' ? 'ماتنفذش (خطوة اتلغت).' : ''), fix: d.fix, errorCode: d.errorCode }));
const meta = { dryRun: run.dryRun, when: fmtCairo(Date.now()), video: describe(run.videoInfo), caption: run.caption };

let logFile = null;
try {
  logFile = results.writeLog('/files/project/logs', results.logEntry(run, list), cairoMonth(Date.now()));
} catch (e) { notes.push('ماقدرتش أكتب اللوج: ' + e.message); }

let telegram = { skipped: true };
try { telegram = await results.sendTelegram($env, results.telegramText(list, meta)); } catch (e) { telegram = { ok: false, error: e.message }; }

return [{ json: { html: results.renderHtml(list, meta), scheduled: !!run.scheduledFor, results: list, logFile, telegram, notes } }];
