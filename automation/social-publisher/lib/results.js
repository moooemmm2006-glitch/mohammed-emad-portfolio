'use strict';
// Result page (Form "Show Text" ending), Telegram summary, and JSONL log.

const fs = require('fs');
const path = require('path');
const { request } = require('./http');

function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One line of text per destination (shared by Telegram and tests). */
function lineFor(r) {
  if (r.status === 'ok') return '✅ ' + r.label + ' → ' + r.link + (r.note ? ' (' + r.note + ')' : '');
  return '❌ ' + r.label + ' → ' + r.errorAr + (r.fix ? ' — ' + r.fix : '');
}

function counts(results) {
  const ok = results.filter((r) => r.status === 'ok').length;
  return { ok, failed: results.length - ok, total: results.length };
}

function renderHtml(results, meta) {
  meta = meta || {};
  const c = counts(results);
  const rows = results
    .map((r) => {
      if (r.status === 'ok')
        return (
          '<li class="ok"><span class="i">✅</span><div><b><bdi>' + esc(r.label) + '</bdi></b> → <a href="' + esc(r.link) + '" target="_blank" rel="noopener" dir="ltr">' + esc(r.link) + '</a>' +
          (r.note ? '<div class="note">' + esc(r.note) + '</div>' : '') + '</div></li>'
        );
      return (
        '<li class="bad"><span class="i">❌</span><div><b><bdi>' + esc(r.label) + '</bdi></b> → ' + esc(r.errorAr) +
        (r.fix ? '<div class="fix">الحل: ' + esc(r.fix) + '</div>' : '') + '</div></li>'
      );
    })
    .join('');
  const title = c.failed === 0 ? 'اتنشر في كل الأماكن 🎉' : c.ok === 0 ? 'ماتنشرش في أي مكان' : 'اتنشر في ' + c.ok + ' من ' + c.total;
  return (
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>نتيجة النشر</title><style>' +
    'body{font-family:system-ui,"Segoe UI",Tahoma,sans-serif;background:#f6f7f9;color:#1d2330;margin:0;padding:24px 16px}' +
    '.card{max-width:760px;margin:0 auto;background:#fff;border-radius:14px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.06)}' +
    'h1{font-size:22px;margin:0 0 6px}.sub{color:#5b6475;font-size:14px;margin-bottom:18px}' +
    'ul{list-style:none;padding:0;margin:0}li{display:flex;gap:10px;padding:12px 0;border-top:1px solid #eef0f3;line-height:1.6;word-break:break-word}' +
    '.i{font-size:18px}.note{color:#8a5a00;font-size:13px}.fix{color:#5b6475;font-size:13px}a{color:#1259c3}' +
    '.dry{background:#fff4d6;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:14px}' +
    '.again{display:inline-block;margin-top:18px;background:#1259c3;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none}' +
    '@media (prefers-color-scheme:dark){body{background:#12151b;color:#e7e9ee}.card{background:#1b1f27;box-shadow:none}li{border-color:#2a2f3a}.sub,.fix{color:#a3abba}a{color:#7fb0ff}.dry{background:#3a3115}.note{color:#f0c060}}' +
    '</style></head><body><div class="card">' +
    (meta.dryRun ? '<div class="dry">تجربة (DRY_RUN=true): ماحصلش نشر حقيقي.</div>' : '') +
    '<h1>' + esc(title) + '</h1>' +
    '<div class="sub">' + esc(meta.when || '') + (meta.video ? ' · ' + esc(meta.video) : '') + '</div>' +
    '<ul>' + rows + '</ul>' +
    '<a class="again" href="/form/publish">انشر فيديو تاني</a>' +
    '</div></body></html>'
  );
}

function telegramText(results, meta) {
  meta = meta || {};
  const c = counts(results);
  const head = (meta.dryRun ? '[تجربة] ' : '') + 'نتيجة النشر — ' + c.ok + '/' + c.total + ' نجح' + (meta.when ? '\n' + meta.when : '');
  const cap = meta.caption ? '\n«' + String(meta.caption).split('\n')[0].slice(0, 80) + '»' : '';
  const text = head + cap + '\n\n' + results.map(lineFor).join('\n');
  return text.length > 4096 ? text.slice(0, 4090) + '…' : text; // Bot API limit: 4096 chars
}

async function sendTelegram(env, text, http) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { skipped: true };
  const base = env.MOCK_API_BASE ? env.MOCK_API_BASE + '/telegram' : 'https://api.telegram.org';
  const r = await (http || request)({
    method: 'POST',
    url: base + '/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage',
    json: { chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true },
    throwOnError: false,
  });
  return { ok: !!(r.json && r.json.ok), status: r.status };
}

function logEntry(run, results) {
  return {
    date: new Date().toISOString(),
    submittedAt: run.startedAt ? new Date(run.startedAt).toISOString() : null,
    runId: run.runId,
    dryRun: !!run.dryRun,
    scheduledFor: run.scheduledFor || null,
    caption: run.caption,
    hashtags: run.hashtags || '',
    video: run.videoInfo || null,
    results: results.map((r) => ({
      destination: r.label,
      platform: r.platform,
      ok: r.status === 'ok',
      link: r.link || null,
      note: r.note || null,
      error: r.status === 'ok' ? null : r.errorAr,
      errorCode: r.status === 'ok' ? null : r.errorCode || null,
    })),
  };
}

/** Append to logs/YYYY-MM.jsonl. Month uses Cairo time. */
function writeLog(dir, entry, monthKey) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, (monthKey || entry.date.slice(0, 7)) + '.jsonl');
  fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  return file;
}

module.exports = { renderHtml, telegramText, sendTelegram, logEntry, writeLog, lineFor, counts, esc };
