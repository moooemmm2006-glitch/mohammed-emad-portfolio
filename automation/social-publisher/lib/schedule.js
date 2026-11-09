'use strict';
// Parse the optional "publish at" date/time from the form (Cairo time, DST aware).

const TZ = 'Africa/Cairo';

function toLatinDigits(s) {
  return String(s || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

/** Offset (minutes) of tz from UTC at the given UTC instant. */
function tzOffsetMinutes(utcMs, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

/** Wall-clock time in tz -> UTC ms. */
function zonedToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let utc = guess - tzOffsetMinutes(guess, tz) * 60000;
  utc = guess - tzOffsetMinutes(utc, tz) * 60000;
  return utc;
}

function parseDate(s) {
  s = toLatinDigits(s).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return [+m[1], +m[2], +m[3]];
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s); // dd/mm/yyyy
  if (m) return [+m[3], +m[2], +m[1]];
  return null;
}

function parseTime(s) {
  s = toLatinDigits(s).trim().toLowerCase();
  const m = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|ص|م|صباحا|مساء|صباحًا|مساءً)?$/.exec(s);
  if (!m) return null;
  let h = +m[1];
  const mi = m[2] ? +m[2] : 0;
  const suf = m[3];
  if (suf && /pm|م|مساء/.test(suf) && h < 12) h += 12;
  if (suf && /am|ص/.test(suf) && h === 12) h = 0;
  if (h > 23 || mi > 59) return null;
  return [h, mi];
}

function fmtCairo(utcMs) {
  return new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, dateStyle: 'full', timeStyle: 'short' }).format(new Date(utcMs));
}

/**
 * input: {when: "انشر دلوقتي" | "جدول", date, time}; returns
 *   {scheduled:false} | {scheduled:true, utcMs, iso, display} | {error}
 */
function parseSchedule(input, nowMs) {
  const when = String((input && input.when) || '');
  const wantsSchedule = /جدول|schedule/i.test(when) || (!when && input && (input.date || input.time));
  if (!wantsSchedule) return { scheduled: false };
  const d = parseDate((input && input.date) || '');
  const t = parseTime((input && input.time) || '');
  if (!d) return { error: 'اختار تاريخ النشر.' };
  if (!t) return { error: 'اكتب الساعة بالشكل ده: 21:30 أو 9:30 م.' };
  const utcMs = zonedToUtc(d[0], d[1], d[2], t[0], t[1], TZ);
  if (isNaN(utcMs)) return { error: 'التاريخ أو الساعة مش مفهومين.' };
  if (utcMs < (nowMs || Date.now()) + 30 * 1000) return { error: 'الوقت اللي اخترته عدّى خلاص. اختار وقت جاي.' };
  return { scheduled: true, utcMs, iso: new Date(utcMs).toISOString(), display: fmtCairo(utcMs) };
}

/** "YYYY-MM" in Cairo time, for the monthly log file. */
function cairoMonth(utcMs) {
  const p = {};
  for (const part of new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(new Date(utcMs))) p[part.type] = part.value;
  return p.year + '-' + p.month;
}

module.exports = { parseSchedule, parseDate, parseTime, zonedToUtc, tzOffsetMinutes, fmtCairo, cairoMonth, toLatinDigits, TZ };
