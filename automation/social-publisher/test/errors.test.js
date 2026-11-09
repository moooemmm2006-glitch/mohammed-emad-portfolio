'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { mapError, PublishError } = require('../lib/errors');

const meta = (code, extra) => ({ status: 400, body: { error: Object.assign({ code, message: 'm' + code }, extra) } });

test('Meta 190 -> token expired, names the env var', () => {
  const r = mapError('facebook', meta(190), { tokenEnv: 'FB_TOKEN_PAGE_1' });
  assert.match(r.ar, /التوكن خلص/);
  assert.match(r.ar, /FB_TOKEN_PAGE_1/);
  assert.match(r.fix, /جدّده/);
});

test('Meta Reels error table codes', () => {
  assert.match(mapError('facebook', meta(1363128)).ar, /3 لـ 90 ثانية/);
  assert.match(mapError('facebook', meta(1363040)).ar, /16:9/);
  assert.match(mapError('facebook', meta(1363127)).ar, /540x960/);
  assert.match(mapError('facebook', meta(1363129)).ar, /24 لـ 60/);
  assert.match(mapError('instagram', meta(10)).ar, /صلاحية/);
  assert.match(mapError('instagram', meta(4)).ar, /حد عدد الطلبات/);
});

test('TikTok error codes from the Direct Post table', () => {
  const tt = (code, status) => ({ status: status || 403, body: { error: { code, message: 'x' } } });
  assert.match(mapError('tiktok', tt('access_token_invalid', 401)).fix, /ربط تيك توك/);
  assert.match(mapError('tiktok', tt('unaudited_client_can_only_post_to_private_accounts')).fix, /Private/);
  assert.match(mapError('tiktok', tt('spam_risk_too_many_posts')).ar, /حد النشر اليومي/);
  assert.match(mapError('tiktok', { status: 400, tiktokCode: 'invalid_grant', body: { error: 'invalid_grant' } }).ar, /refresh token/);
});

test('YouTube quota and auth', () => {
  assert.match(mapError('youtube', { status: 403, body: { error: { errors: [{ reason: 'quotaExceeded' }] } } }).ar, /حصة يوتيوب/);
  assert.match(mapError('youtube', { status: 401, body: {} }).fix, /Reconnect/);
});

test('Cloudinary signature error', () => {
  assert.match(mapError('cloudinary', { status: 401, body: { error: { message: 'Invalid Signature' } } }).fix, /CLOUDINARY_API_SECRET/);
});

test('network errors and unknown errors', () => {
  assert.match(mapError('facebook', { code: 'ENOTFOUND' }).fix, /النت/);
  assert.match(mapError('facebook', new Error('boom')).ar, /boom/);
  assert.match(mapError('facebook', { status: 502, body: '' }).ar, /502/);
});

test('PublishError passes through unchanged', () => {
  const r = mapError('instagram', new PublishError('IG_QUOTA', 'حد', 'استنى'));
  assert.deepStrictEqual([r.code, r.ar, r.fix], ['IG_QUOTA', 'حد', 'استنى']);
});

test('YouTube node-level error (no credential selected) is explained', () => {
  const yt = require('../lib/youtube');
  const r = yt.parseInitResponse({ error: { message: 'Credential with ID "REPLACE_ME" does not exist for type "youTubeOAuth2Api".' } });
  assert.strictEqual(r.ok, false);
  assert.match(mapError('youtube', r.error).fix, /YouTube account/);
  assert.strictEqual(yt.parseInitResponse({ statusCode: 200, headers: { location: 'https://u' } }).location, 'https://u');
  assert.strictEqual(yt.parseUploadResponse({ statusCode: 200, body: { id: 'abc' } }).link, 'https://www.youtube.com/shorts/abc');
  assert.match(mapError('youtube', yt.parseUploadResponse({ statusCode: 403, body: { error: { errors: [{ reason: 'quotaExceeded' }] } } }).error).ar, /حصة/);
});
