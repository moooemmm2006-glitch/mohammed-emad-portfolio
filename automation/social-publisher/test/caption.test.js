'use strict';
const test = require('node:test');
const assert = require('node:assert');
const c = require('../lib/caption');

test('normalizeHashtags accepts spaces, commas, Arabic comma, missing #', () => {
  assert.deepStrictEqual(c.normalizeHashtags('food, #cairo  ##مطعم،عروض'), ['#food', '#cairo', '#مطعم', '#عروض']);
  assert.deepStrictEqual(c.normalizeHashtags('#a #A #b'), ['#a', '#b']);
  assert.deepStrictEqual(c.normalizeHashtags(''), []);
});

test('combine appends only hashtags not already in the caption', () => {
  assert.strictEqual(c.combine('أكل جامد #cairo', '#cairo food'), 'أكل جامد #cairo\n\n#food');
  assert.strictEqual(c.combine('hello', ''), 'hello');
});

test('YouTube title defaults to the first caption line', () => {
  assert.strictEqual(c.buildYoutubeTitle('', '\n  أول سطر  \nتاني سطر'), 'أول سطر');
  assert.strictEqual(c.buildYoutubeTitle('  عنوان   مخصوص ', 'x'), 'عنوان مخصوص');
});

test('YouTube title is truncated to 100 chars without splitting emoji and strips < >', () => {
  const long = '😀'.repeat(60) + ' ' + 'كلمة '.repeat(40);
  const t = c.buildYoutubeTitle('', long);
  assert.ok(Array.from(t).length <= 100, 'len ' + Array.from(t).length);
  assert.ok(!/\uD83D$/.test(t.replace('…', '')), 'no broken surrogate');
  assert.ok(t.endsWith('…'));
  assert.strictEqual(c.buildYoutubeTitle('<b>hi</b>', ''), '‹b›hi‹/b›');
});

test('YouTube description adds #Shorts once and fits 5000 bytes', () => {
  assert.match(c.buildYoutubeDescription('cap', '#x'), /#x #Shorts$/);
  assert.strictEqual((c.buildYoutubeDescription('cap #shorts', '') .match(/#shorts/gi) || []).length, 1);
  const d = c.buildYoutubeDescription('ع'.repeat(4000), '#tag');
  assert.ok(Buffer.byteLength(d, 'utf8') <= 5000);
  assert.match(d, /#tag #Shorts$/);
});

test('Instagram limits: 2200 chars, 30 hashtags, 20 mentions', () => {
  const ok = c.buildCaptions({ caption: 'hi', hashtags: '' });
  assert.deepStrictEqual(ok.instagram.errors, []);
  const many = c.buildCaptions({ caption: 'x', hashtags: Array.from({ length: 31 }, (_, i) => 't' + i).join(' ') });
  assert.match(many.instagram.errors.join(), /31 هاشتاج/);
  const ment = c.buildCaptions({ caption: Array.from({ length: 21 }, (_, i) => '@u' + i).join(' ') });
  assert.match(ment.instagram.errors.join(), /21 منشن/);
  const long = c.buildCaptions({ caption: 'a'.repeat(2201) });
  assert.match(long.instagram.errors.join(), /2201 حرف/);
  assert.match(long.tiktok.errors.join(), /2200/);
  assert.deepStrictEqual(long.facebook.errors, []);
});

test('empty caption is an error everywhere', () => {
  const r = c.buildCaptions({ caption: '  ' });
  for (const p of ['facebook', 'instagram', 'tiktok', 'youtube']) assert.ok(r[p].errors.length, p);
});

test('email addresses are not counted as mentions', () => {
  assert.strictEqual(c.countMentions('mail me@x.com and @real'), 1);
});
