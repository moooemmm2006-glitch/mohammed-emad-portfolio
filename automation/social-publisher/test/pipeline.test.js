'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const p = require('../lib/pipeline');
const { probeFile } = require('../lib/video');
const r = require('../lib/results');
const { createMock } = require('./mock-server');

const example = fs.readFileSync(path.join(__dirname, '..', 'accounts.example.json'), 'utf8');
const v95 = probeFile(path.join(__dirname, 'fixtures', 'vertical_95s.mp4'));
const v5 = probeFile(path.join(__dirname, 'fixtures', 'vertical_5s.mp4'));

test('prepare builds page-2 fields from accounts.json', () => {
  const out = p.prepare({ configText: example, videoInfo: v5, form: { caption: 'أول سطر\nتاني', hashtags: 'food' } });
  assert.ok(!out.fatal);
  const cb = out.formFields.find((f) => f.fieldName === 'destinations');
  assert.strictEqual(cb.fieldType, 'checkbox');
  assert.strictEqual(cb.fieldOptions.values.length, 5);
  assert.match(out.formFields[0].html, /الفيديو والكابشن مناسبين/);
});

test('prepare: fatal errors for bad config / bad video', () => {
  assert.match(p.prepare({ configText: '{', videoInfo: v5, form: { caption: 'x' } }).fatal, /accounts.json/);
  assert.match(p.prepare({ configText: example, videoInfo: null, form: { caption: 'x' } }).fatal, /mp4/);
});

test('plan: 95 s video fails only Facebook, others pending', () => {
  const prep = p.prepare({ configText: example, videoInfo: v95, form: { caption: 'cap', hashtags: '#a' } });
  assert.match(prep.formFields[0].html, /أطول من 90 ثانية/);
  const labels = prep.config.destinations.map((d) => d.label);
  const out = p.plan(Object.assign({}, prep, { page2: { destinations: labels, when: p.NOW_LABEL } }));
  const byKey = Object.fromEntries(out.items.map((i) => [i.key, i]));
  assert.strictEqual(byKey['fb:100000000000001'].status, 'error');
  assert.match(byKey['fb:100000000000001'].errorAr, /أطول من 90 ثانية/);
  assert.strictEqual(byKey.tiktok.status, 'pending');
  assert.strictEqual(byKey.youtube.title, 'cap');
  assert.match(byKey.youtube.text, /#a #Shorts$/);
  assert.strictEqual(out.schedule.scheduled, false);
});

test('plan: nothing selected / bad schedule', () => {
  const prep = p.prepare({ configText: example, videoInfo: v5, form: { caption: 'c' } });
  assert.match(p.plan(Object.assign({}, prep, { page2: { destinations: [] } })).error, /ماختارتش/);
  assert.match(p.plan(Object.assign({}, prep, { page2: { destinations: ['تيك توك — @alaseel'], when: p.LATER_LABEL } })).error, /تاريخ/);
});

test('dry-run mock: success + forced failure with mapped reason', () => {
  const item = { platform: 'tiktok', key: 'tiktok', label: 'تيك توك', privacyLevel: 'SELF_ONLY', status: 'pending' };
  const ok = p.mockPublish(item, '');
  assert.strictEqual(ok.status, 'ok');
  assert.strictEqual(ok.note, 'اتنشر Private لحد ما تيك توك يوافق على التطبيق');
  const bad = p.mockPublish(item, 'instagram,tiktok');
  assert.strictEqual(bad.status, 'error');
  assert.match(bad.fix, /ربط تيك توك/);
  assert.match(p.mockPublish({ platform: 'facebook', key: 'fb:1', label: 'x' }, 'fb:1').ar || p.mockPublish({ platform: 'facebook', key: 'fb:1', label: 'x' }, 'fb:1').errorAr, /التوكن خلص/);
});

test('result page, telegram text, jsonl log', async (t) => {
  const results = [
    { label: 'فيسبوك — أ', platform: 'facebook', status: 'ok', link: 'https://www.facebook.com/reel/1' },
    { label: 'تيك توك', platform: 'tiktok', status: 'ok', link: 'https://www.tiktok.com/@x', note: 'اتنشر Private لحد ما تيك توك يوافق على التطبيق' },
    { label: 'إنستجرام — <b>', platform: 'instagram', status: 'error', errorAr: 'التوكن خلص', fix: 'جدّده' },
  ];
  const html = r.renderHtml(results, { when: 'الآن', dryRun: true });
  assert.match(html, /اتنشر في 2 من 3/);
  assert.match(html, /✅/);
  assert.match(html, /❌/);
  assert.match(html, /&lt;b&gt;/, 'labels are escaped');
  assert.match(html, /DRY_RUN/);
  const txt = r.telegramText(results, {});
  assert.match(txt, /✅ فيسبوك — أ → https:\/\/www.facebook.com\/reel\/1/);
  assert.match(txt, /❌ إنستجرام — <b> → التوكن خلص — جدّده/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-'));
  const entry = r.logEntry({ runId: '7', caption: 'c', startedAt: Date.UTC(2026, 10, 9) }, results);
  const file = r.writeLog(dir, entry, '2026-11');
  r.writeLog(dir, entry, '2026-11');
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
  assert.strictEqual(path.basename(file), '2026-11.jsonl');
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0].results[2].ok, false);

  const mock = createMock();
  const base = await mock.listen();
  t.after(() => mock.close());
  assert.deepStrictEqual(await r.sendTelegram({}, 'x'), { skipped: true });
  const s = await r.sendTelegram({ MOCK_API_BASE: base, TELEGRAM_BOT_TOKEN: '1:abc', TELEGRAM_CHAT_ID: '42' }, txt);
  assert.strictEqual(s.ok, true);
  assert.strictEqual(mock.log[0].path, '/telegram/bot1:abc/sendMessage');
  assert.strictEqual(mock.log[0].params.chat_id, '42');
});
