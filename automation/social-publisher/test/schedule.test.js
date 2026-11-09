'use strict';
const test = require('node:test');
const assert = require('node:assert');
const s = require('../lib/schedule');

test('publish now', () => {
  assert.deepStrictEqual(s.parseSchedule({ when: 'انشر دلوقتي' }), { scheduled: false });
});

test('Cairo wall time -> UTC, winter (+2) and summer DST (+3)', () => {
  const now = Date.UTC(2026, 0, 1);
  const w = s.parseSchedule({ when: 'جدول لوقت معيّن', date: '2026-12-20', time: '21:30' }, now);
  assert.strictEqual(w.iso, '2026-12-20T19:30:00.000Z');
  const su = s.parseSchedule({ when: 'جدول', date: '2026-07-20', time: '9:30 م' }, now);
  assert.strictEqual(su.iso, '2026-07-20T18:30:00.000Z');
});

test('Arabic digits and dd/mm/yyyy', () => {
  const r = s.parseSchedule({ when: 'جدول', date: '٢٠/١٢/٢٠٢٦', time: '٠٩:٠٥ ص' }, Date.UTC(2026, 0, 1));
  assert.strictEqual(r.iso, '2026-12-20T07:05:00.000Z');
});

test('errors: past time, missing date, bad time', () => {
  const now = Date.UTC(2026, 10, 9, 12);
  assert.match(s.parseSchedule({ when: 'جدول', date: '2026-11-01', time: '10:00' }, now).error, /عدّى/);
  assert.match(s.parseSchedule({ when: 'جدول', time: '10:00' }, now).error, /تاريخ/);
  assert.match(s.parseSchedule({ when: 'جدول', date: '2026-12-01', time: '25:00' }, now).error, /الساعة/);
});

test('cairoMonth uses Cairo time near midnight', () => {
  assert.strictEqual(s.cairoMonth(Date.UTC(2026, 10, 30, 23, 0)), '2026-12');
});
