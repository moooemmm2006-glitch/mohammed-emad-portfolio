'use strict';
// Caption / hashtag / title building per platform.
// Limits (from the official docs, Nov 2026):
//   Instagram caption: max 2200 characters, 30 hashtags, 20 @ tags (IG User Media reference)
//   TikTok title:      max 2200 UTF-16 code units (Direct Post reference)
//   YouTube title:     max 100 characters, no < or > (videos resource)
//   YouTube description: max 5000 bytes, no < or > (videos resource)
//   Facebook Reels description: no limit stated in the Reels Publishing doc.

const LIMITS = {
  instagram: { chars: 2200, hashtags: 30, mentions: 20 },
  tiktok: { utf16: 2200 },
  youtube: { titleChars: 100, descriptionBytes: 5000 },
};

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
const MENTION_RE = /(^|[^\p{L}\p{N}_])@[\p{L}\p{N}_.]+/gu;

/** "#a #b", "a, b", "a b", "#a,#b" -> ["#a", "#b"] (deduplicated, order kept). */
function normalizeHashtags(input) {
  if (!input) return [];
  const parts = String(input)
    .split(/[\s,،]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => '#' + t.replace(/^#+/, ''))
    .filter((t) => t.length > 1);
  const seen = new Set();
  const out = [];
  for (const t of parts) {
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

/** Caption + hashtags not already present in the caption. */
function combine(caption, hashtags, extra) {
  const text = String(caption || '').replace(/\r\n?/g, '\n').trim();
  const present = new Set((text.match(HASHTAG_RE) || []).map((h) => h.toLowerCase()));
  const tags = normalizeHashtags(hashtags).concat(extra || []).filter((t) => {
    const k = t.toLowerCase();
    if (present.has(k)) return false;
    present.add(k);
    return true;
  });
  if (!tags.length) return text;
  return text ? text + '\n\n' + tags.join(' ') : tags.join(' ');
}

function countHashtags(text) {
  return (String(text).match(HASHTAG_RE) || []).length;
}
function countMentions(text) {
  return (String(text).match(MENTION_RE) || []).length;
}
function charCount(text) {
  return Array.from(String(text)).length; // code points
}

/** Cut to max code points without splitting emoji/surrogates; prefer a word boundary. */
function truncateChars(text, max, ellipsis) {
  const chars = Array.from(String(text));
  if (chars.length <= max) return chars.join('');
  const ell = ellipsis === undefined ? '…' : ellipsis;
  let cut = chars.slice(0, max - ell.length).join('');
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > max * 0.6) cut = cut.slice(0, lastSpace);
  return cut.trimEnd() + ell;
}

function truncateBytes(text, maxBytes) {
  let out = '';
  let bytes = 0;
  for (const ch of Array.from(String(text))) {
    const b = Buffer.byteLength(ch, 'utf8');
    if (bytes + b > maxBytes) break;
    out += ch;
    bytes += b;
  }
  return out;
}

function stripAngle(text) {
  return String(text).replace(/</g, '‹').replace(/>/g, '›');
}

/** YouTube title: explicit title, else the caption's first non-empty line; max 100 chars. */
function buildYoutubeTitle(title, caption) {
  let t = String(title || '').trim();
  if (!t) {
    const first = String(caption || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean);
    t = first || 'Short';
  }
  t = stripAngle(t.replace(/\s+/g, ' '));
  return truncateChars(t, LIMITS.youtube.titleChars);
}

function buildYoutubeDescription(caption, hashtags) {
  const hasShorts = /#shorts\b/i.test(String(caption || '')) || normalizeHashtags(hashtags).some((t) => t.toLowerCase() === '#shorts');
  const text = stripAngle(combine(caption, hashtags, hasShorts ? [] : ['#Shorts']));
  if (Buffer.byteLength(text, 'utf8') <= LIMITS.youtube.descriptionBytes) return text;
  // Keep the hashtags line (which carries #Shorts) and shorten the caption part.
  const tagsLine = text.slice(text.lastIndexOf('\n') + 1);
  const room = LIMITS.youtube.descriptionBytes - Buffer.byteLength('…\n\n' + tagsLine, 'utf8');
  return truncateBytes(stripAngle(String(caption || '').trim()), room) + '…\n\n' + tagsLine;
}

/**
 * Build the text for every platform and report problems.
 * returns { facebook:{text}, instagram:{text,errors}, tiktok:{text,errors}, youtube:{title,description,errors} }
 */
function buildCaptions({ caption, hashtags, title }) {
  const full = combine(caption, hashtags);
  const out = {};

  out.facebook = { text: full, errors: [] };

  const igErr = [];
  if (charCount(full) > LIMITS.instagram.chars)
    igErr.push('الكابشن ' + charCount(full) + ' حرف وإنستجرام أقصاه ' + LIMITS.instagram.chars + ' حرف. قصّره.');
  if (countHashtags(full) > LIMITS.instagram.hashtags)
    igErr.push('فيه ' + countHashtags(full) + ' هاشتاج وإنستجرام أقصاه ' + LIMITS.instagram.hashtags + '.');
  if (countMentions(full) > LIMITS.instagram.mentions)
    igErr.push('فيه ' + countMentions(full) + ' منشن (@) وإنستجرام أقصاه ' + LIMITS.instagram.mentions + '.');
  out.instagram = { text: full, errors: igErr };

  const ttErr = [];
  if (full.length > LIMITS.tiktok.utf16) ttErr.push('الكابشن أطول من ' + LIMITS.tiktok.utf16 + ' حرف (حد تيك توك). قصّره.');
  out.tiktok = { text: full, errors: ttErr };

  const ytTitle = buildYoutubeTitle(title, caption);
  out.youtube = { title: ytTitle, description: buildYoutubeDescription(caption, hashtags), errors: [] };
  if (String(title || '').trim() && charCount(String(title).trim()) > LIMITS.youtube.titleChars) {
    out.youtube.warnings = ['عنوان يوتيوب أطول من 100 حرف، فاتقص لـ: "' + ytTitle + '"'];
  }

  if (!String(caption || '').trim()) {
    for (const k of ['facebook', 'instagram', 'tiktok', 'youtube']) out[k].errors.push('الكابشن فاضي.');
  }
  return out;
}

module.exports = {
  LIMITS,
  normalizeHashtags,
  combine,
  countHashtags,
  countMentions,
  charCount,
  truncateChars,
  truncateBytes,
  buildYoutubeTitle,
  buildYoutubeDescription,
  buildCaptions,
};
