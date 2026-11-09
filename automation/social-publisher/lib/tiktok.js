'use strict';
// TikTok Content Posting API — Direct Post with FILE_UPLOAD (docs last updated Oct 27 2026).
//   creator info: POST https://open.tiktokapis.com/v2/post/publish/creator_info/query/
//   init:         POST https://open.tiktokapis.com/v2/post/publish/video/init/
//                   {post_info:{title, privacy_level, disable_*, is_aigc, brand_*}, source_info:{source:"FILE_UPLOAD", video_size, chunk_size, total_chunk_count}}
//                 -> data.publish_id, data.upload_url (valid 1 hour)
//   upload:       PUT upload_url, Content-Type video/mp4|video/quicktime, Content-Length, Content-Range bytes a-b/total
//                 -> 206 for intermediate chunks, 201 when all parts are uploaded
//   status:       POST https://open.tiktokapis.com/v2/post/publish/status/fetch/ {publish_id}
//                 -> data.status PROCESSING_UPLOAD | PUBLISH_COMPLETE | FAILED, fail_reason, publicaly_available_post_id[]
// Chunk rules (Media Transfer Guide): chunks 5–64 MB, last chunk may be up to 128 MB,
//   total_chunk_count = floor(video_size / chunk_size), < 5 MB must be one chunk,
//   > 64 MB must be several chunks, 1–1000 chunks, uploaded in order.
// OAuth (Login Kit for Web + "Manage OAuth Access Tokens"):
//   authorize: https://www.tiktok.com/v2/auth/authorize/?client_key&response_type=code&scope&redirect_uri&state
//   token:     POST https://open.tiktokapis.com/v2/oauth/token/ (x-www-form-urlencoded)
//              client_key, client_secret, code, grant_type=authorization_code, redirect_uri
//   refresh:   same URL, grant_type=refresh_token, refresh_token. Access token lives 2 h,
//              refresh token 180 days and ROTATES: always store the newest one.

const fs = require('fs');
const crypto = require('crypto');
const { request, sleep: realSleep, encodeForm } = require('./http');
const { PublishError, TIKTOK } = require('./errors');

const MB = 1024 * 1024;
const SINGLE_MAX = 64 * MB;
const CHUNK = 10 * MB;

function chunkPlan(size) {
  if (!(size > 0)) throw new Error('video size must be > 0');
  if (size <= SINGLE_MAX) return { chunkSize: size, totalChunkCount: 1, chunks: [{ start: 0, end: size - 1 }] };
  const total = Math.floor(size / CHUNK);
  const chunks = [];
  for (let i = 0; i < total; i++) {
    const start = i * CHUNK;
    const end = i === total - 1 ? size - 1 : start + CHUNK - 1; // trailing bytes go into the last chunk
    chunks.push({ start, end });
  }
  if (total > 1000) throw new PublishError('TIKTOK_TOO_BIG', 'الفيديو كبير جدًا لتيك توك.', 'قلّل حجم الفيديو.');
  return { chunkSize: CHUNK, totalChunkCount: total, chunks };
}

function bases(env) {
  const mock = env && env.MOCK_API_BASE;
  return { api: mock ? mock + '/tiktok' : 'https://open.tiktokapis.com', auth: 'https://www.tiktok.com/v2/auth/authorize/' };
}

function checkApiError(r) {
  const code = r.json && r.json.error && r.json.error.code;
  if (code && code !== 'ok') {
    const e = new Error('TikTok error ' + code);
    e.status = r.status;
    e.body = r.json;
    throw e;
  }
}

// ---------- token storage ----------
function loadToken(path) {
  if (!fs.existsSync(path)) return null;
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveToken(path, resp, nowMs) {
  const t = {
    access_token: resp.access_token,
    refresh_token: resp.refresh_token,
    open_id: resp.open_id,
    scope: resp.scope,
    expires_at: nowMs + Number(resp.expires_in || 0) * 1000,
    refresh_expires_at: nowMs + Number(resp.refresh_expires_in || 0) * 1000,
    saved_at: new Date(nowMs).toISOString(),
  };
  fs.writeFileSync(path, JSON.stringify(t, null, 2));
  return t;
}

function appCreds(env) {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET)
    throw new PublishError('TIKTOK_APP_MISSING', 'بيانات تطبيق تيك توك مش موجودة في .env.', 'حط TIKTOK_CLIENT_KEY و TIKTOK_CLIENT_SECRET في .env (README: TikTok).');
  return { key: env.TIKTOK_CLIENT_KEY, secret: env.TIKTOK_CLIENT_SECRET };
}

async function ensureAccessToken(opts) {
  const http = opts.http || request;
  const now = opts.now ? opts.now() : Date.now();
  const tok = loadToken(opts.tokenPath);
  if (!tok || !tok.refresh_token)
    throw new PublishError('TIKTOK_NOT_CONNECTED', 'حساب تيك توك مش مربوط لسه.', 'افتح فورم "ربط تيك توك" (http://localhost:5678/form/tiktok-connect) واربط الحساب.');
  if (tok.access_token && tok.expires_at - now > 5 * 60 * 1000) return tok;
  if (tok.refresh_expires_at && tok.refresh_expires_at < now)
    throw new PublishError('TIKTOK_REFRESH_EXPIRED', 'ربط تيك توك خلص (عدّى 180 يوم).', 'افتح فورم "ربط تيك توك" واربط الحساب تاني.');
  const app = appCreds(opts.env);
  const r = await http({
    method: 'POST',
    url: bases(opts.env).api + '/v2/oauth/token/',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: encodeForm({ client_key: app.key, client_secret: app.secret, grant_type: 'refresh_token', refresh_token: tok.refresh_token }),
    throwOnError: false,
  });
  if (!r.json || !r.json.access_token) {
    const e = new Error('TikTok refresh failed');
    e.status = r.status || 400;
    e.body = r.json || r.text;
    e.tiktokCode = (r.json && r.json.error) || 'invalid_grant';
    throw e;
  }
  return saveToken(opts.tokenPath, r.json, now);
}

function buildAuthorizeUrl({ clientKey, redirectUri, state, scope }) {
  return (
    bases({}).auth +
    '?' +
    encodeForm({ client_key: clientKey, response_type: 'code', scope: scope || 'user.info.basic,video.publish', redirect_uri: redirectUri, state })
  );
}

/** Pull code/state out of the URL the browser landed on after authorising. */
function parseCallbackUrl(text) {
  const s = String(text || '').trim();
  const q = s.includes('?') ? s.slice(s.indexOf('?') + 1) : s;
  const out = {};
  for (const part of q.split(/[&#]/)) {
    const i = part.indexOf('=');
    if (i > 0) out[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
  }
  return out;
}

async function exchangeCode(opts) {
  const http = opts.http || request;
  const app = appCreds(opts.env);
  const r = await http({
    method: 'POST',
    url: bases(opts.env).api + '/v2/oauth/token/',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: encodeForm({ client_key: app.key, client_secret: app.secret, code: opts.code, grant_type: 'authorization_code', redirect_uri: opts.redirectUri }),
    throwOnError: false,
  });
  if (!r.json || !r.json.access_token) {
    const msg = (r.json && (r.json.error_description || r.json.error)) || r.text;
    throw new PublishError('TIKTOK_EXCHANGE', 'تيك توك رفض الكود: ' + msg, 'ابدأ الربط من الأول (الكود بيستعمل مرة واحدة وبيخلص بسرعة) واتأكد إن TIKTOK_REDIRECT_URI مطابق بالظبط للي في Login Kit.');
  }
  return saveToken(opts.tokenPath, r.json, opts.now ? opts.now() : Date.now());
}

// ---------- publishing ----------
async function publishVideo(opts) {
  const http = opts.http || request;
  const sleep = opts.sleep || realSleep;
  const now = opts.now || (() => Date.now());
  const api = bases(opts.env).api;
  const tok = await ensureAccessToken(opts);
  const auth = { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json; charset=UTF-8' };

  const ci = await http({ method: 'POST', url: api + '/v2/post/publish/creator_info/query/', headers: auth, body: '{}' });
  checkApiError(ci);
  const info = (ci.json && ci.json.data) || {};
  const options = info.privacy_level_options || [];
  if (options.length && !options.includes(opts.privacyLevel)) {
    throw new PublishError(
      'TIKTOK_PRIVACY',
      'مستوى الخصوصية ' + opts.privacyLevel + ' مش متاح لحسابك (المتاح: ' + options.join(', ') + ').',
      'غيّر tiktok.privacyLevel في accounts.json. قبل مراجعة تيك توك استعمل SELF_ONLY.',
    );
  }
  if (info.max_video_post_duration_sec && opts.durationSec && opts.durationSec > info.max_video_post_duration_sec) {
    throw new PublishError('TIKTOK_DURATION', 'الفيديو أطول من الحد بتاع حسابك على تيك توك (' + info.max_video_post_duration_sec + ' ثانية).', 'قصّر الفيديو.');
  }

  const size = opts.fileSize;
  const plan = chunkPlan(size);
  const init = await http({
    method: 'POST',
    url: api + '/v2/post/publish/video/init/',
    headers: auth,
    json: {
      post_info: {
        title: opts.title || '',
        privacy_level: opts.privacyLevel,
        disable_duet: !!opts.disableDuet,
        disable_comment: !!opts.disableComment,
        disable_stitch: !!opts.disableStitch,
        is_aigc: !!opts.isAigc,
        brand_content_toggle: false,
        brand_organic_toggle: false,
      },
      source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: plan.chunkSize, total_chunk_count: plan.totalChunkCount },
    },
  });
  checkApiError(init);
  const publishId = init.json.data.publish_id;
  const uploadUrl = init.json.data.upload_url;

  const mime = /\.mov$/i.test(opts.filePath) ? 'video/quicktime' : 'video/mp4';
  for (const ch of plan.chunks) {
    const r = await http({
      method: 'PUT',
      url: uploadUrl,
      headers: { 'Content-Type': mime, 'Content-Range': 'bytes ' + ch.start + '-' + ch.end + '/' + size },
      file: { path: opts.filePath, start: ch.start, end: ch.end },
      timeoutMs: 15 * 60 * 1000,
    });
    if (r.status !== 206 && r.status !== 201) throw new PublishError('TIKTOK_UPLOAD', 'رفع الفيديو لتيك توك ماكملش (HTTP ' + r.status + ').', 'جرب تاني.', r.text);
  }

  const deadline = now() + (opts.timeoutMs || 10 * 60 * 1000);
  let data = {};
  for (;;) {
    const st = await http({ method: 'POST', url: api + '/v2/post/publish/status/fetch/', headers: auth, json: { publish_id: publishId } });
    checkApiError(st);
    data = (st.json && st.json.data) || {};
    if (data.status === 'PUBLISH_COMPLETE') break;
    if (data.status === 'FAILED') {
      const pair = TIKTOK[data.fail_reason] || ['تيك توك فشل في النشر (' + data.fail_reason + ').', 'شوف تفاصيل الخطأ في ملف اللوج.'];
      throw new PublishError('TIKTOK_FAILED', pair[0], pair[1], data);
    }
    if (now() > deadline) break; // still processing; report as sent
    await sleep(opts.pollMs || 5000);
  }

  const user = info.creator_username;
  const ids = data.publicaly_available_post_id || [];
  const link = ids.length && user ? 'https://www.tiktok.com/@' + user + '/video/' + ids[0] : user ? 'https://www.tiktok.com/@' + user : 'https://www.tiktok.com/';
  let note = '';
  if (opts.privacyLevel === 'SELF_ONLY') note = 'اتنشر Private لحد ما تيك توك يوافق على التطبيق';
  else if (data.status !== 'PUBLISH_COMPLETE') note = 'اتبعت لتيك توك ولسه بيتعالج؛ هيظهر على حسابك خلال دقايق.';
  else if (!ids.length) note = 'اتنشر، وتيك توك بيراجعه قبل ما يظهر للناس.';
  return { id: publishId, link, note, nickname: info.creator_nickname };
}

function newState() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { chunkPlan, publishVideo, ensureAccessToken, exchangeCode, buildAuthorizeUrl, parseCallbackUrl, loadToken, saveToken, newState, CHUNK, SINGLE_MAX };
