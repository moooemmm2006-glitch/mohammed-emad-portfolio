'use strict';
// Glue logic for the workflow's Code nodes, kept here so it can be unit-tested.

const { parseConfig, selectDestinations } = require('./config');
const { buildCaptions } = require('./caption');
const { validateFor, describe } = require('./video');
const { parseSchedule } = require('./schedule');
const { mapError } = require('./errors');
const { esc } = require('./results');

const PLATFORM_AR = { facebook: 'فيسبوك', instagram: 'إنستجرام', tiktok: 'تيك توك', youtube: 'يوتيوب' };
const NOW_LABEL = 'انشر دلوقتي';
const LATER_LABEL = 'جدول لوقت معيّن';

/** Validate video + captions for every platform. */
function checkAll(videoInfo, captions) {
  const out = {};
  for (const p of ['facebook', 'instagram', 'tiktok', 'youtube']) {
    const v = validateFor(p, videoInfo);
    const c = captions[p] || { errors: [] };
    out[p] = { errors: v.errors.concat(c.errors || []), warnings: v.warnings.concat(c.warnings || []) };
  }
  return out;
}

/** Fields (JSON) for form page 2 — built from accounts.json, so no node edits are needed. */
function buildPage2Fields(config, checks, videoInfo, captions, dryRun) {
  const used = new Set(config.destinations.map((d) => d.platform));
  let html = '<div dir="rtl" style="text-align:right">';
  if (dryRun) html += '<p style="background:#fff4d6;padding:6px 10px;border-radius:6px">وضع التجربة شغال (DRY_RUN=true): مش هيتنشر حاجة بجد.</p>';
  html += '<p><b>الفيديو:</b> ' + esc(describe(videoInfo)) + '</p>';
  if (used.has('youtube')) html += '<p><b>عنوان يوتيوب:</b> ' + esc(captions.youtube.title) + '</p>';
  const lines = [];
  for (const p of ['facebook', 'instagram', 'tiktok', 'youtube']) {
    if (!used.has(p)) continue;
    for (const e of checks[p].errors) lines.push('❌ <b>' + PLATFORM_AR[p] + ':</b> ' + esc(e));
    for (const w of checks[p].warnings) lines.push('⚠️ <b>' + PLATFORM_AR[p] + ':</b> ' + esc(w));
  }
  html += lines.length ? '<p>' + lines.join('<br>') + '</p><p style="font-size:13px">الأماكن اللي عليها ❌ هتتسجل كفشل بالسبب ده لو اخترتها، والباقي هيتنشر عادي.</p>' : '<p>✅ الفيديو والكابشن مناسبين لكل الأماكن.</p>';
  html += '</div>';

  return [
    { fieldType: 'html', elementName: 'summary', html },
    {
      fieldLabel: 'انشر فين؟',
      fieldName: 'destinations',
      fieldType: 'checkbox',
      fieldOptions: { values: config.destinations.map((d) => ({ option: d.label })) },
      requiredField: true,
    },
    {
      fieldLabel: 'إمتى؟',
      fieldName: 'when',
      fieldType: 'radio',
      fieldOptions: { values: [{ option: NOW_LABEL }, { option: LATER_LABEL }] },
      defaultValue: NOW_LABEL,
      requiredField: true,
    },
    { fieldLabel: 'تاريخ النشر (لو اخترت جدول)', fieldName: 'date', fieldType: 'date' },
    { fieldLabel: 'الساعة بتوقيت القاهرة (لو اخترت جدول) — مثال 21:30', fieldName: 'time', fieldType: 'text', placeholder: '21:30' },
  ];
}

/** Everything the "prepare" node computes from page 1. */
function prepare({ configText, videoInfo, form, dryRun }) {
  const parsed = parseConfig(configText);
  if (!parsed.ok) return { fatal: 'مشكلة في accounts.json:<br>' + parsed.errors.map(esc).join('<br>') };
  if (!videoInfo || !videoInfo.hasVideo) return { fatal: 'مش قادر أقرا الفيديو. ارفع ملف mp4 أو mov سليم.' };
  const captions = buildCaptions({ caption: form.caption, hashtags: form.hashtags, title: form.title });
  const checks = checkAll(videoInfo, captions);
  return {
    config: parsed.config,
    captions,
    checks,
    formFields: buildPage2Fields(parsed.config, checks, videoInfo, captions, dryRun),
  };
}

/** Turn page-2 answers into one item per destination. */
function plan({ config, captions, checks, page2, nowMs }) {
  const sched = parseSchedule({ when: page2.when, date: page2.date, time: page2.time }, nowMs);
  const chosen = selectDestinations(config, page2.destinations);
  if (sched.error) return { error: sched.error };
  if (!chosen.length) return { error: 'ماختارتش ولا مكان للنشر.' };
  const items = chosen.map((d) => {
    const item = Object.assign({}, d, { status: 'pending' });
    if (d.platform === 'youtube') {
      item.title = captions.youtube.title;
      item.text = captions.youtube.description;
    } else item.text = captions[d.platform].text;
    const errs = checks[d.platform].errors;
    if (errs.length) {
      item.status = 'error';
      item.errorAr = errs.join(' ');
      item.fix = 'عدّل الفيديو أو الكابشن وانشر تاني.';
      item.errorCode = 'VALIDATION';
    }
    return item;
  });
  return { items, schedule: sched };
}

/** Mark an item done/failed (used by every platform node). */
function succeed(item, res) {
  return Object.assign({}, item, { status: 'ok', link: res.link, note: res.note || '', remoteId: res.id || null });
}
function fail(item, err, ctx) {
  const m = mapError(item.platform === 'cloudinary' ? 'cloudinary' : item.platform, err, ctx);
  return Object.assign({}, item, { status: 'error', errorAr: m.ar, fix: m.fix, errorCode: m.code });
}

// ---------- DRY_RUN mocks ----------
// DRY_RUN_FAIL picks which destinations fake a failure: comma list of
// platforms ("tiktok"), keys ("ig:1784…") or exact labels.
const MOCK_ERRORS = {
  facebook: { status: 400, body: { error: { code: 190, message: 'Error validating access token: Session has expired' } } },
  instagram: { name: 'PublishError', code: 'IG_QUOTA', ar: 'وصلت للحد اليومي للنشر على إنستجرام (50 من 50 في آخر 24 ساعة).', fix: 'استنى لحد ما يعدي 24 ساعة على أقدم بوست اتنشر من الـ API.' },
  tiktok: { status: 401, body: { error: { code: 'access_token_invalid', message: 'The access token is invalid or not found in the request.' } } },
  youtube: { status: 403, body: { error: { code: 403, message: 'quota exceeded', errors: [{ reason: 'quotaExceeded' }] } } },
};

function shouldFail(item, failSpec) {
  const list = String(failSpec || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.some((s) => s === item.platform || s === item.key || s === item.label);
}

function mockPublish(item, failSpec) {
  if (shouldFail(item, failSpec)) return fail(item, MOCK_ERRORS[item.platform]);
  const id = 'dry' + Math.random().toString(36).slice(2, 10);
  const links = {
    facebook: 'https://www.facebook.com/reel/' + id,
    instagram: 'https://www.instagram.com/reel/' + id + '/',
    tiktok: 'https://www.tiktok.com/@your.account',
    youtube: 'https://www.youtube.com/shorts/' + id,
  };
  const note = item.platform === 'tiktok' && item.privacyLevel === 'SELF_ONLY' ? 'اتنشر Private لحد ما تيك توك يوافق على التطبيق' : '';
  return succeed(item, { link: links[item.platform], id, note });
}

module.exports = { checkAll, buildPage2Fields, prepare, plan, succeed, fail, mockPublish, shouldFail, NOW_LABEL, LATER_LABEL, PLATFORM_AR };
