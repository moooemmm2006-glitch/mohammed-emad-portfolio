'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { createMock } = require('./mock-server');
const meta = require('../lib/meta');
const { mapError } = require('../lib/errors');

const file = path.join(__dirname, 'fixtures', 'vertical_5s.mp4');
const size = fs.statSync(file).size;
const fast = { sleep: async () => {}, pollMs: 1 };

test('Meta flows against the documented shapes', async (t) => {
  const mock = createMock();
  const base = await mock.listen();
  const env = { MOCK_API_BASE: base };
  t.after(() => mock.close());

  await t.test('Facebook Reel: start -> rupload -> finish -> poll', async () => {
    const r = await meta.publishFacebookReel(Object.assign({ env, pageId: '111', token: 'PAGE_TOKEN', filePath: file, fileSize: size, description: 'كابشن #x' }, fast));
    assert.match(r.link, /^https:\/\/www\.facebook\.com\/reel\/v/);
    const up = mock.log.find((l) => l.path.startsWith('/rupload/'));
    assert.strictEqual(up.bodyBytes, size, 'whole file uploaded');
    assert.strictEqual(up.headers.authorization, 'OAuth PAGE_TOKEN');
    const fin = mock.log.find((l) => l.params && l.params.upload_phase === 'finish');
    assert.strictEqual(fin.params.video_state, 'PUBLISHED');
    assert.strictEqual(fin.params.description, 'كابشن #x');
  });

  await t.test('Facebook expired token -> mapped Arabic error', async () => {
    await assert.rejects(meta.publishFacebookReel(Object.assign({ env, pageId: '111', token: 'EXPIRED', filePath: file, fileSize: size }, fast)), (e) => {
      assert.match(mapError('facebook', e, { tokenEnv: 'FB_TOKEN_PAGE_1' }).ar, /التوكن خلص/);
      return true;
    });
  });

  await t.test('Facebook processing error is reported', async () => {
    const http = async (o) => {
      if (/fields=status/.test(o.url) || (o.query && o.query.fields)) return { status: 200, json: { status: { video_status: 'processing', processing_phase: { status: 'error', error: { message: 'Resolution too low.' } } } } };
      if (o.url.includes('rupload')) return { status: 200, json: { success: true } };
      return { status: 200, json: { video_id: 'v1', success: true } };
    };
    await assert.rejects(meta.publishFacebookReel(Object.assign({ http, pageId: '1', token: 't', filePath: file, fileSize: size }, fast)), /Resolution too low/);
  });

  await t.test('Facebook still processing at timeout -> success with note', async () => {
    let clock = 0;
    const http = async (o) => {
      if (o.query && o.query.fields) return { status: 200, json: { status: { video_status: 'processing' } } };
      return { status: 200, json: { video_id: 'v9', success: true } };
    };
    const r = await meta.publishFacebookReel({ http, pageId: '1', token: 't', filePath: file, fileSize: size, sleep: async () => (clock += 60000), now: () => clock, timeoutMs: 120000 });
    assert.match(r.note, /بيتعالج/);
  });

  await t.test('Instagram Reel: quota -> container -> poll -> publish -> permalink', async () => {
    const r = await meta.publishInstagramReel(Object.assign({ env, igUserId: '178', token: 'PAGE_TOKEN', videoUrl: 'https://res.cloudinary.com/x.mp4', caption: 'hi' }, fast));
    assert.match(r.link, /^https:\/\/www\.instagram\.com\/reel\/m/);
    const create = mock.log.find((l) => /\/178\/media$/.test(l.path));
    assert.strictEqual(create.params.media_type, 'REELS');
    assert.strictEqual(create.params.share_to_feed, 'true');
    assert.ok(mock.log.some((l) => l.path.endsWith('/media_publish')));
  });

  await t.test('Instagram daily limit reached -> clear message, nothing created', async () => {
    const before = mock.log.length;
    await assert.rejects(meta.publishInstagramReel(Object.assign({ env, igUserId: '999', token: 'T', videoUrl: 'https://x/v.mp4' }, fast)), (e) => {
      assert.strictEqual(e.code, 'IG_QUOTA');
      assert.match(e.ar, /50 من 50/);
      return true;
    });
    assert.ok(!mock.log.slice(before).some((l) => l.path.endsWith('/media')));
  });

  await t.test('Instagram container ERROR and timeout', async () => {
    const mk = (code) => async (o) => {
      if (o.url.endsWith('content_publishing_limit')) return { status: 200, json: { data: [] } };
      if (o.method === 'POST') return { status: 200, json: { id: 'c1' } };
      return { status: 200, json: { status_code: code, status: 'Error: 2207026' } };
    };
    await assert.rejects(meta.publishInstagramReel(Object.assign({ http: mk('ERROR'), igUserId: '1', token: 't', videoUrl: 'u' }, fast)), (e) => e.code === 'IG_CONTAINER_ERROR');
    let clock = 0;
    await assert.rejects(
      meta.publishInstagramReel({ http: mk('IN_PROGRESS'), igUserId: '1', token: 't', videoUrl: 'u', sleep: async () => (clock += 60000), now: () => clock, timeoutMs: 600000 }),
      (e) => e.code === 'IG_TIMEOUT' && /10 دقايق/.test(e.ar),
    );
  });
});

test('fbLink handles relative and absolute permalinks', () => {
  assert.strictEqual(meta.fbLink({ permalink_url: '/reel/1' }, '1'), 'https://www.facebook.com/reel/1');
  assert.strictEqual(meta.fbLink({ permalink_url: 'https://fb.com/x' }, '1'), 'https://fb.com/x');
  assert.strictEqual(meta.fbLink({}, '7'), 'https://www.facebook.com/reel/7');
});
