'use strict';
// Dependency-free MP4/MOV probe (the n8n Docker image has no ffprobe) and
// per-platform validation. Rules come from the official docs, Nov 2026:
//   Facebook Reels (Reels Publishing API): 3–90 s, aspect between 16:9 and 9:16,
//     min 540x960, recommended 1080x1920, 24–60 fps, .mp4 recommended.
//   Instagram Reels (IG User Media reference): MOV/MP4, moov atom at the front,
//     3 s – 15 min, max 300 MB, max 1920 columns, 23–60 fps, 9:16 recommended.
//   TikTok (Media Transfer Guide): MP4/WebM/MOV, max 4 GB, 23–60 fps,
//     360–4096 px per side, max 10 min through the API (creator limit checked live).
//   YouTube Shorts (YouTube Help): square or vertical, up to 3 minutes.

const fs = require('fs');

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts']);
const READ_FULL = new Set(['mvhd', 'tkhd', 'mdhd', 'hdlr', 'stts']);

function readAt(fd, pos, len) {
  const buf = Buffer.alloc(len);
  const n = fs.readSync(fd, buf, 0, len, pos);
  return n === len ? buf : buf.subarray(0, n);
}

function readUInt64(buf, off) {
  return buf.readUInt32BE(off) * 4294967296 + buf.readUInt32BE(off + 4);
}

function walk(fd, start, end, depth, visit) {
  let pos = start;
  while (pos + 8 <= end) {
    const h = readAt(fd, pos, 16);
    if (h.length < 8) break;
    let size = h.readUInt32BE(0);
    const type = h.toString('latin1', 4, 8);
    let header = 8;
    if (size === 1) {
      if (h.length < 16) break;
      size = readUInt64(h, 8);
      header = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < header || pos + size > end + 8) break; // corrupt/truncated
    const bodyStart = pos + header;
    const bodyEnd = Math.min(pos + size, end);
    visit({ type, pos, size, bodyStart, bodyEnd, depth });
    if (CONTAINERS.has(type) && depth < 8) walk(fd, bodyStart, bodyEnd, depth + 1, visit);
    pos += size;
  }
}

/** Probe an MP4/MOV file. Returns null if it doesn't look like one. */
function probeFile(path) {
  const stat = fs.statSync(path);
  const fd = fs.openSync(path, 'r');
  try {
    const head = readAt(fd, 0, 12);
    if (head.length < 12) return null;
    const firstType = head.toString('latin1', 4, 8);
    if (!['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip'].includes(firstType)) return null;

    const info = {
      sizeBytes: stat.size,
      brand: firstType === 'ftyp' ? head.toString('latin1', 8, 12).trim() : null,
      durationSec: null,
      width: null,
      height: null,
      rotation: 0,
      fps: null,
      hasAudio: false,
      hasVideo: false,
      moovBeforeMdat: null,
    };
    let moovPos = -1;
    let mdatPos = -1;
    let track = null;
    const tracks = [];

    walk(fd, 0, stat.size, 0, (b) => {
      if (b.depth === 0 && b.type === 'moov') moovPos = b.pos;
      if (b.depth === 0 && b.type === 'mdat' && mdatPos < 0) mdatPos = b.pos;
      if (b.type === 'trak') {
        track = {};
        tracks.push(track);
      }
      if (!READ_FULL.has(b.type)) return;
      const len = Math.min(b.bodyEnd - b.bodyStart, 8 * 1024 * 1024);
      const d = readAt(fd, b.bodyStart, len);
      if (d.length < 4) return;
      const version = d[0];
      if (b.type === 'mvhd') {
        const timescale = version === 1 ? d.readUInt32BE(20) : d.readUInt32BE(12);
        const duration = version === 1 ? readUInt64(d, 24) : d.readUInt32BE(16);
        if (timescale) info.durationSec = duration / timescale;
      } else if (b.type === 'tkhd' && track) {
        const off = version === 1 ? 4 + 32 : 4 + 20; // after duration
        const matrixOff = off + 8 + 2 + 2 + 2 + 2;
        if (d.length >= matrixOff + 44) {
          const a = d.readInt32BE(matrixOff) / 65536;
          const bb = d.readInt32BE(matrixOff + 4) / 65536;
          track.rotation = ((Math.round((Math.atan2(bb, a) * 180) / Math.PI) % 360) + 360) % 360;
          track.width = d.readUInt32BE(matrixOff + 36) / 65536;
          track.height = d.readUInt32BE(matrixOff + 40) / 65536;
        }
      } else if (b.type === 'mdhd' && track) {
        track.timescale = version === 1 ? d.readUInt32BE(20) : d.readUInt32BE(12);
        track.duration = version === 1 ? readUInt64(d, 24) : d.readUInt32BE(16);
      } else if (b.type === 'hdlr' && track && !track.handler && d.length >= 12) {
        // first hdlr in a trak is the media handler (QuickTime adds a data handler under minf too)
        track.handler = d.toString('latin1', 8, 12);
      } else if (b.type === 'stts' && track && d.length >= 8) {
        const count = d.readUInt32BE(4);
        let samples = 0;
        let ticks = 0;
        for (let i = 0; i < count && 8 + i * 8 + 8 <= d.length; i++) {
          const c = d.readUInt32BE(8 + i * 8);
          samples += c;
          ticks += c * d.readUInt32BE(12 + i * 8);
        }
        track.samples = samples;
        track.ticks = ticks;
      }
    });

    if (moovPos < 0) return null;
    info.moovBeforeMdat = mdatPos < 0 ? true : moovPos < mdatPos;
    const v = tracks.find((t) => t.handler === 'vide');
    info.hasAudio = tracks.some((t) => t.handler === 'soun');
    if (v) {
      info.hasVideo = true;
      info.rotation = v.rotation || 0;
      const swap = info.rotation === 90 || info.rotation === 270;
      info.width = Math.round(swap ? v.height : v.width) || null;
      info.height = Math.round(swap ? v.width : v.height) || null;
      if (v.samples && v.ticks && v.timescale) info.fps = Math.round(((v.samples * v.timescale) / v.ticks) * 100) / 100;
      if (!info.durationSec && v.timescale) info.durationSec = v.duration / v.timescale;
    }
    if (info.durationSec !== null) info.durationSec = Math.round(info.durationSec * 100) / 100;
    return info;
  } finally {
    fs.closeSync(fd);
  }
}

const MB = 1024 * 1024;

function fmtSec(s) {
  if (s < 60) return Math.round(s) + ' ثانية';
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m + ':' + String(r).padStart(2, '0') + ' دقيقة';
}

function ratioInfo(v) {
  if (!v.width || !v.height) return null;
  return { r: v.width / v.height, vertical: v.height > v.width, square: Math.abs(v.width - v.height) / v.height < 0.02 };
}

function is916(v) {
  const r = ratioInfo(v);
  return r && Math.abs(r.r - 9 / 16) < 0.02;
}

/** Validate for one platform. Returns {errors:[], warnings:[]} in Arabic. */
function validateFor(platform, v) {
  const errors = [];
  const warnings = [];
  if (!v || !v.hasVideo) {
    errors.push('مش قادر أقرا الفيديو. لازم يكون ملف mp4 أو mov سليم.');
    return { errors, warnings };
  }
  const d = v.durationSec;
  const r = ratioInfo(v);
  const short = Math.min(v.width || 0, v.height || 0);
  const long = Math.max(v.width || 0, v.height || 0);
  const fpsOut = (min, max) => v.fps && (v.fps < min - 0.5 || v.fps > max + 0.5);

  if (platform === 'facebook') {
    if (d !== null && d > 90) errors.push('الفيديو أطول من 90 ثانية (' + fmtSec(d) + '). ريلز فيسبوك من 3 لـ 90 ثانية.');
    if (d !== null && d < 3) errors.push('الفيديو أقصر من 3 ثواني.');
    if (r && (r.r > 16 / 9 + 0.01 || r.r < 9 / 16 - 0.01)) errors.push('أبعاد الفيديو برا المسموح (بين 16:9 و 9:16).');
    if (short && (short < 540 || long < 960)) errors.push('الجودة قليلة (' + v.width + 'x' + v.height + '). أقل حاجة 540x960.');
    if (fpsOut(24, 60)) errors.push('عدد الفريمات ' + v.fps + ' والمسموح من 24 لـ 60.');
  } else if (platform === 'instagram') {
    if (d !== null && d > 15 * 60) errors.push('الفيديو أطول من 15 دقيقة (حد ريلز إنستجرام).');
    if (d !== null && d < 3) errors.push('الفيديو أقصر من 3 ثواني.');
    if (v.sizeBytes > 300 * MB) errors.push('حجم الفيديو أكبر من 300 ميجا (حد إنستجرام).');
    if (v.width && v.width > 1920) errors.push('عرض الفيديو ' + v.width + ' بكسل وإنستجرام أقصاه 1920.');
    if (fpsOut(23, 60)) errors.push('عدد الفريمات ' + v.fps + ' والمسموح من 23 لـ 60.');
    if (v.moovBeforeMdat === false) warnings.push('الملف مش "faststart" (الـ moov في الآخر). إنستجرام ممكن يرفضه؛ لو حصل صدّر الفيديو تاني من برنامج المونتاج.');
  } else if (platform === 'tiktok') {
    if (v.sizeBytes > 4 * 1024 * MB) errors.push('حجم الفيديو أكبر من 4 جيجا (حد تيك توك).');
    if (d !== null && d > 600) errors.push('الفيديو أطول من 10 دقايق (حد تيك توك عن طريق الـ API).');
    if (d !== null && d > 180) warnings.push('أغلب حسابات تيك توك أقصاها 3 دقايق؛ هنتأكد من حد حسابك وقت النشر.');
    if (short && (short < 360 || long > 4096)) errors.push('أبعاد الفيديو لازم تكون بين 360 و 4096 بكسل.');
    if (fpsOut(23, 60)) errors.push('عدد الفريمات ' + v.fps + ' والمسموح من 23 لـ 60.');
  } else if (platform === 'youtube') {
    if (d !== null && d > 180) warnings.push('الفيديو أطول من 3 دقايق، فيوتيوب هيعتبره فيديو عادي مش Shorts.');
    if (r && !r.vertical && !r.square) warnings.push('الفيديو عرضي، فيوتيوب هيعتبره فيديو عادي مش Shorts. الشورتس لازم يكون طولي أو مربع.');
  }
  if (!errors.length && r && !is916(v) && platform !== 'youtube') {
    warnings.push('الأبعاد مش 9:16 (' + v.width + 'x' + v.height + ')؛ ممكن يظهر فيه حواف أو يتقص.');
  }
  return { errors, warnings };
}

function describe(v) {
  if (!v || !v.hasVideo) return 'ملف غير معروف';
  const parts = [];
  if (v.durationSec !== null) parts.push(fmtSec(v.durationSec));
  if (v.width) parts.push(v.width + 'x' + v.height);
  if (v.fps) parts.push(v.fps + ' fps');
  parts.push((v.sizeBytes / MB).toFixed(1) + ' MB');
  return parts.join(' · ');
}

module.exports = { probeFile, validateFor, describe, fmtSec, is916 };
