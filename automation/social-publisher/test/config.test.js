'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseConfig, selectDestinations } = require('../lib/config');
const example = fs.readFileSync(path.join(__dirname, '..', 'accounts.example.json'), 'utf8');

test('the shipped example parses and skips disabled pages', () => {
  const r = parseConfig(example);
  assert.ok(r.ok, r.errors.join('\n'));
  const labels = r.config.destinations.map((d) => d.label);
  assert.deepStrictEqual(labels, ['فيسبوك — مطعم الأصيل', 'فيسبوك — عروض الأصيل', 'إنستجرام — @alaseel.eg', 'تيك توك — @alaseel', 'يوتيوب شورتس — قناة الأصيل']);
  assert.strictEqual(r.config.settings.keepCloudCopy, false);
  assert.strictEqual(r.config.destinations[3].privacyLevel, 'SELF_ONLY');
});

test('BOM from Windows Notepad is tolerated', () => {
  assert.ok(parseConfig('﻿' + example).ok);
});

test('bad JSON gives an Arabic message', () => {
  const r = parseConfig('{ "facebookPages": [ }');
  assert.strictEqual(r.ok, false);
  assert.match(r.errors[0], /JSON مش سليم/);
});

test('field validation', () => {
  const r = parseConfig({ facebookPages: [{ name: 'x', pageId: 'abc', tokenEnv: 'lower' }], instagramAccounts: [{ name: 'y' }], tiktok: { enabled: true, privacyLevel: 'EVERYONE' }, youtube: { enabled: true, privacyStatus: 'secret' } });
  const all = r.errors.join('\n');
  assert.match(all, /pageId/);
  assert.match(all, /tokenEnv/);
  assert.match(all, /igUserId/);
  assert.match(all, /privacyLevel/);
  assert.match(all, /privacyStatus/);
});

test('duplicate names are rejected', () => {
  const r = parseConfig({ facebookPages: [{ name: 'a', pageId: '1', tokenEnv: 'A' }, { name: 'a', pageId: '2', tokenEnv: 'B' }] });
  assert.match(r.errors.join(), /متكررين/);
});

test('empty config', () => {
  assert.match(parseConfig({}).errors.join(), /مفيش ولا صفحة/);
});

test('selectDestinations maps checkbox labels back (string or array)', () => {
  const cfg = parseConfig(example).config;
  assert.deepStrictEqual(selectDestinations(cfg, ['تيك توك — @alaseel']).map((d) => d.key), ['tiktok']);
  assert.deepStrictEqual(selectDestinations(cfg, 'فيسبوك — مطعم الأصيل').map((d) => d.key), ['fb:100000000000001']);
  assert.deepStrictEqual(selectDestinations(cfg, undefined), []);
});
