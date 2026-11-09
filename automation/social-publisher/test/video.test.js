'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const v = require('../lib/video');
const fx = (f) => path.join(__dirname, 'fixtures', f);

test('probe vertical mp4', () => {
  const i = v.probeFile(fx('vertical_5s.mp4'));
  assert.strictEqual(i.durationSec, 5);
  assert.strictEqual(i.width, 1080);
  assert.strictEqual(i.height, 1920);
  assert.strictEqual(i.fps, 30);
  assert.strictEqual(i.hasAudio, true);
  assert.strictEqual(i.moovBeforeMdat, true);
});

test('probe phone .mov with rotation matrix -> display size is vertical', () => {
  const i = v.probeFile(fx('rotated_phone.mov'));
  assert.strictEqual(i.width, 1080);
  assert.strictEqual(i.height, 1920);
  assert.ok([90, 270].includes(i.rotation));
});

test('detect moov at end of file', () => {
  assert.strictEqual(v.probeFile(fx('moov_at_end.mp4')).moovBeforeMdat, false);
});

test('non-video file returns null and fails validation', () => {
  assert.strictEqual(v.probeFile(fx('not_video.mp4')), null);
  assert.match(v.validateFor('facebook', null).errors[0], /mp4 أو mov/);
});

test('Facebook: > 90 s is an error, Instagram/TikTok accept it', () => {
  const i = v.probeFile(fx('vertical_95s.mp4'));
  assert.match(v.validateFor('facebook', i).errors.join(), /أطول من 90 ثانية/);
  assert.deepStrictEqual(v.validateFor('instagram', i).errors, []);
  assert.deepStrictEqual(v.validateFor('tiktok', i).errors, []);
});

test('horizontal video: FB ok (16:9 allowed) but warns; YouTube warns not a Short', () => {
  const i = v.probeFile(fx('horizontal_5s.mp4'));
  assert.deepStrictEqual(v.validateFor('facebook', i).errors, []);
  assert.match(v.validateFor('facebook', i).warnings.join(), /9:16/);
  assert.match(v.validateFor('youtube', i).warnings.join(), /مش Shorts/);
});

test('Instagram warns about non-faststart file', () => {
  assert.match(v.validateFor('instagram', v.probeFile(fx('moov_at_end.mp4'))).warnings.join(), /faststart/);
});

test('synthetic limits: size, resolution, fps', () => {
  const base = { hasVideo: true, durationSec: 10, width: 1080, height: 1920, fps: 30, sizeBytes: 10e6 };
  assert.match(v.validateFor('instagram', Object.assign({}, base, { sizeBytes: 301 * 1024 * 1024 })).errors.join(), /300 ميجا/);
  assert.match(v.validateFor('facebook', Object.assign({}, base, { width: 360, height: 640 })).errors.join(), /540x960/);
  assert.match(v.validateFor('facebook', Object.assign({}, base, { fps: 15 })).errors.join(), /24 لـ 60/);
  assert.match(v.validateFor('tiktok', Object.assign({}, base, { durationSec: 700 })).errors.join(), /10 دقايق/);
  assert.match(v.validateFor('youtube', Object.assign({}, base, { durationSec: 200 })).warnings.join(), /3 دقايق/);
  assert.match(v.validateFor('facebook', Object.assign({}, base, { width: 3000, height: 1000 })).errors.join(), /16:9/);
});
