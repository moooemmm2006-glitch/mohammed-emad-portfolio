'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createMock } = require('./mock-server');
const tt = require('../lib/tiktok');

const MB = 1024 * 1024;

test('chunk plan follows the Media Transfer Guide', () => {
  assert.deepStrictEqual(tt.chunkPlan(4 * MB), { chunkSize: 4 * MB, totalChunkCount: 1, chunks: [{ start: 0, end: 4 * MB - 1 }] });
  assert.strictEqual(tt.chunkPlan(64 * MB).totalChunkCount, 1);
  const p = tt.chunkPlan(50000123 + 64 * MB); // > 64 MB must be chunked
  assert.strictEqual(p.totalChunkCount, Math.floor((50000123 + 64 * MB) / (10 * MB)));
  const last = p.chunks[p.chunks.length - 1];
  assert.strictEqual(last.end, 50000123 + 64 * MB - 1);
  assert.ok(last.end - last.start + 1 < 128 * MB);
  for (let i = 1; i < p.chunks.length; i++) assert.strictEqual(p.chunks[i].start, p.chunks[i - 1].end + 1);
  assert.ok(p.chunks.slice(0, -1).every((c) => c.end - c.start + 1 >= 5 * MB && c.end - c.start + 1 <= 64 * MB));
});

test('authorize URL + callback parsing', () => {
  const u = tt.buildAuthorizeUrl({ clientKey: 'ck', redirectUri: 'https://example.com/cb/', state: 's1' });
  assert.ok(u.startsWith('https://www.tiktok.com/v2/auth/authorize/?client_key=ck&response_type=code&scope=user.info.basic%2Cvideo.publish&redirect_uri=https%3A%2F%2Fexample.com%2Fcb%2F&state=s1'));
  assert.deepStrictEqual(tt.parseCallbackUrl('https://example.com/cb/?code=abc%2A1&scopes=video.publish&state=s1'), { code: 'abc*1', scopes: 'video.publish', state: 's1' });
});

test('publish with token refresh (rotation saved) and chunked upload', async (t) => {
  const mock = createMock();
  const base = await mock.listen();
  t.after(() => mock.close());
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-'));
  const tokenPath = path.join(dir, 'tiktok-token.json');
  const env = { MOCK_API_BASE: base, TIKTOK_CLIENT_KEY: 'ck', TIKTOK_CLIENT_SECRET: 'cs' };

  await assert.rejects(tt.publishVideo({ env, tokenPath }), (e) => e.code === 'TIKTOK_NOT_CONNECTED');

  await tt.exchangeCode({ env, tokenPath, code: 'c', redirectUri: 'https://x/cb/' });
  const saved = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  assert.strictEqual(saved.refresh_token, 'rft.mock1');
  // pretend it expired
  saved.expires_at = Date.now() - 1000;
  fs.writeFileSync(tokenPath, JSON.stringify(saved));

  const file = path.join(dir, 'v.mp4');
  fs.writeFileSync(file, Buffer.alloc(70 * MB, 1));
  const r = await tt.publishVideo({ env, tokenPath, filePath: file, fileSize: 70 * MB, title: 'cap', privacyLevel: 'SELF_ONLY', durationSec: 10, sleep: async () => {} });
  assert.strictEqual(r.note, 'اتنشر Private لحد ما تيك توك يوافق على التطبيق');
  assert.strictEqual(r.link, 'https://www.tiktok.com/@mock.creator');
  assert.strictEqual(JSON.parse(fs.readFileSync(tokenPath, 'utf8')).refresh_token, 'rft.mock2', 'rotated refresh token stored');
  const puts = mock.log.filter((l) => l.method === 'PUT');
  assert.strictEqual(puts.length, 7);
  assert.strictEqual(puts.reduce((a, p) => a + p.bodyBytes, 0), 70 * MB);
  const init = mock.log.find((l) => l.path.endsWith('/video/init/'));
  assert.strictEqual(init.params.post_info.privacy_level, 'SELF_ONLY');

  await assert.rejects(
    tt.publishVideo({ env, tokenPath, filePath: file, fileSize: 70 * MB, privacyLevel: 'PUBLIC_TO_EVERYONE', sleep: async () => {} }),
    (e) => e.code === 'TIKTOK_PRIVACY',
  );
  await assert.rejects(tt.publishVideo({ env, tokenPath, filePath: file, fileSize: 70 * MB, privacyLevel: 'SELF_ONLY', durationSec: 400 }), (e) => e.code === 'TIKTOK_DURATION');

  // revoked refresh token -> clear message
  const s2 = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  fs.writeFileSync(tokenPath, JSON.stringify(Object.assign(s2, { expires_at: 0, refresh_token: 'rft.revoked' })));
  const { mapError } = require('../lib/errors');
  await assert.rejects(tt.publishVideo({ env, tokenPath, filePath: file, fileSize: 70 * MB, privacyLevel: 'SELF_ONLY' }), (e) => /refresh token/.test(mapError('tiktok', e).ar));
  fs.rmSync(dir, { recursive: true, force: true });
});
