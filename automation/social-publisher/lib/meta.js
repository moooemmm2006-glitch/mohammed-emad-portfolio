'use strict';
// Facebook Page Reels + Instagram Reels publishing (Meta Graph API v27.0).
//
// Facebook — "Reels Publishing API" doc (updated Jul 30 2026):
//   1. POST graph.facebook.com/{ver}/{page-id}/video_reels  upload_phase=start  -> {video_id, upload_url}
//   2. POST rupload.facebook.com/video-upload/{ver}/{video_id}
//        headers: Authorization: OAuth {page token}, offset: 0, file_size: N; body = file bytes -> {success:true}
//   3. POST graph.facebook.com/{ver}/{page-id}/video_reels  upload_phase=finish, video_state=PUBLISHED, description
//   status: GET /{video_id}?fields=status -> status.{video_status, uploading_phase, processing_phase, publishing_phase}
//   limit: 30 API-published reels per Page per rolling 24 h.
//
// Instagram — "Content Publishing" doc (updated Oct 20 2026), Instagram API with Facebook Login,
// host graph.facebook.com, Page access token of the Page linked to the IG account:
//   1. POST /{ig-user-id}/media  media_type=REELS, video_url, caption, share_to_feed -> {id}
//   2. GET  /{container-id}?fields=status_code,status   until FINISHED (or ERROR/EXPIRED)
//   3. POST /{ig-user-id}/media_publish  creation_id -> {id}
//   4. GET  /{ig-media-id}?fields=permalink
//   limit: GET /{ig-user-id}/content_publishing_limit?fields=quota_usage,config
//   (the docs say 100 posts/24 h on one page and quota_total 50 on another, so we read it live).

const { request, sleep: realSleep } = require('./http');
const { PublishError } = require('./errors');

function bases(env) {
  const mock = env && env.MOCK_API_BASE;
  return {
    graph: mock ? mock + '/graph' : 'https://graph.facebook.com',
    rupload: mock ? mock + '/rupload' : 'https://rupload.facebook.com',
  };
}

function makeCtx(opts) {
  return {
    http: opts.http || request,
    sleep: opts.sleep || realSleep,
    now: opts.now || (() => Date.now()),
    pollMs: opts.pollMs || 10000,
    timeoutMs: opts.timeoutMs || 10 * 60 * 1000,
    version: opts.version || 'v27.0',
    base: bases(opts.env),
    log: opts.log || (() => {}),
  };
}

function phaseError(status) {
  if (!status) return null;
  for (const p of ['uploading_phase', 'processing_phase', 'publishing_phase']) {
    const ph = status[p];
    if (ph && (ph.status === 'error' || ph.error)) return (ph.error && ph.error.message) || p + ' error';
  }
  if (status.video_status === 'error') return 'video_status=error';
  return null;
}

/** Publish a Reel to a Facebook Page. Returns {id, link, note?}. */
async function publishFacebookReel(opts) {
  const c = makeCtx(opts);
  const { pageId, token, filePath, fileSize, description } = opts;
  const g = c.base.graph + '/' + c.version;

  const start = await c.http({ method: 'POST', url: g + '/' + pageId + '/video_reels', json: { upload_phase: 'start', access_token: token } });
  const videoId = start.json && start.json.video_id;
  if (!videoId) throw new PublishError('FB_START', 'فيسبوك مارجّعش video_id.', 'جرب تاني.', start.json);
  c.log('fb start', videoId);

  const up = await c.http({
    method: 'POST',
    url: c.base.rupload + '/video-upload/' + c.version + '/' + videoId,
    headers: { Authorization: 'OAuth ' + token, offset: '0', file_size: String(fileSize), 'Content-Type': 'application/octet-stream' },
    file: { path: filePath, start: 0, end: fileSize - 1 },
    timeoutMs: 30 * 60 * 1000,
  });
  if (!up.json || up.json.success !== true) throw new PublishError('FB_UPLOAD', 'رفع الفيديو لفيسبوك ماكملش.', 'جرب تاني.', up.json);

  const fin = await c.http({
    method: 'POST',
    url: g + '/' + pageId + '/video_reels',
    form: { access_token: token, video_id: videoId, upload_phase: 'finish', video_state: 'PUBLISHED', description: description || '' },
  });
  if (!fin.json || fin.json.success !== true) throw new PublishError('FB_FINISH', 'فيسبوك ماقبلش طلب النشر.', 'جرب تاني.', fin.json);

  // Poll until processing + publishing are complete.
  const deadline = c.now() + c.timeoutMs;
  let last = null;
  for (;;) {
    const st = await c.http({ url: g + '/' + videoId, query: { fields: 'status,permalink_url', access_token: token } });
    last = st.json || {};
    const status = last.status || {};
    const err = phaseError(status);
    if (err) throw new PublishError('FB_PROCESSING', 'فيسبوك رفض الفيديو أثناء المعالجة: ' + err, 'اتأكد إن الفيديو 9:16، من 3 لـ 90 ثانية، 24–60 fps.', status);
    const published = status.publishing_phase && status.publishing_phase.status === 'complete';
    if (published || status.video_status === 'ready') break;
    if (c.now() > deadline) {
      return { id: videoId, link: fbLink(last, videoId), note: 'لسه بيتعالج عند فيسبوك؛ هيظهر خلال دقايق.' };
    }
    await c.sleep(c.pollMs);
  }
  return { id: videoId, link: fbLink(last, videoId) };
}

function fbLink(obj, videoId) {
  const p = obj && obj.permalink_url;
  if (p) return /^https?:/.test(p) ? p : 'https://www.facebook.com' + (p.startsWith('/') ? '' : '/') + p;
  return 'https://www.facebook.com/reel/' + videoId;
}

/** Check IG publishing quota. Returns {usage, total} or null if unknown. */
async function instagramQuota(opts) {
  const c = makeCtx(opts);
  const r = await c.http({
    url: c.base.graph + '/' + c.version + '/' + opts.igUserId + '/content_publishing_limit',
    query: { fields: 'quota_usage,config', access_token: opts.token },
  });
  const d = r.json && r.json.data && r.json.data[0];
  if (!d) return null;
  return { usage: Number(d.quota_usage || 0), total: d.config && d.config.quota_total ? Number(d.config.quota_total) : null };
}

/** Publish a Reel to an Instagram professional account. Returns {id, link}. */
async function publishInstagramReel(opts) {
  const c = makeCtx(opts);
  const { igUserId, token, videoUrl, caption } = opts;
  const g = c.base.graph + '/' + c.version;

  let quota = null;
  try {
    quota = await instagramQuota(opts);
  } catch (e) {
    c.log('quota check failed', e.message); // not fatal; publish will tell us
  }
  if (quota && quota.total && quota.usage >= quota.total) {
    throw new PublishError(
      'IG_QUOTA',
      'وصلت للحد اليومي للنشر على إنستجرام (' + quota.usage + ' من ' + quota.total + ' في آخر 24 ساعة).',
      'استنى لحد ما يعدي 24 ساعة على أقدم بوست اتنشر من الـ API.',
    );
  }

  const created = await c.http({
    method: 'POST',
    url: g + '/' + igUserId + '/media',
    form: { media_type: 'REELS', video_url: videoUrl, caption: caption || '', share_to_feed: opts.shareToFeed === false ? 'false' : 'true', access_token: token },
  });
  const containerId = created.json && created.json.id;
  if (!containerId) throw new PublishError('IG_CREATE', 'إنستجرام مارجّعش container id.', 'جرب تاني.', created.json);

  const deadline = c.now() + c.timeoutMs;
  for (;;) {
    const st = await c.http({ url: g + '/' + containerId, query: { fields: 'status_code,status', access_token: token } });
    const code = st.json && st.json.status_code;
    if (code === 'FINISHED') break;
    if (code === 'PUBLISHED') break;
    if (code === 'ERROR')
      throw new PublishError('IG_CONTAINER_ERROR', 'إنستجرام رفض الفيديو أثناء المعالجة (' + ((st.json && st.json.status) || 'ERROR') + ').', 'اتأكد إن الفيديو MP4 (H.264 + AAC)، 9:16، وإن الملف faststart.', st.json);
    if (code === 'EXPIRED') throw new PublishError('IG_CONTAINER_EXPIRED', 'الـ container بتاع إنستجرام انتهى.', 'جرب تنشر تاني.', st.json);
    if (c.now() > deadline)
      throw new PublishError('IG_TIMEOUT', 'إنستجرام فضل يعالج الفيديو أكتر من ' + Math.round(c.timeoutMs / 60000) + ' دقايق.', 'جرب تاني بفيديو حجمه أقل، أو زوّد pollTimeoutMinutes في accounts.json.', st.json);
    await c.sleep(c.pollMs);
  }

  const pub = await c.http({ method: 'POST', url: g + '/' + igUserId + '/media_publish', form: { creation_id: containerId, access_token: token } });
  const mediaId = pub.json && pub.json.id;
  if (!mediaId) throw new PublishError('IG_PUBLISH', 'إنستجرام ماقبلش النشر.', 'جرب تاني.', pub.json);

  let link = 'https://www.instagram.com/';
  try {
    const p = await c.http({ url: g + '/' + mediaId, query: { fields: 'permalink', access_token: token } });
    if (p.json && p.json.permalink) link = p.json.permalink;
  } catch (e) {
    c.log('permalink failed', e.message);
  }
  return { id: mediaId, link };
}

/** Lightweight token check for the settings checker. */
async function checkPageToken(opts) {
  const c = makeCtx(opts);
  const r = await c.http({ url: c.base.graph + '/' + c.version + '/' + opts.id, query: { fields: opts.fields || 'name', access_token: opts.token } });
  return r.json;
}

module.exports = { publishFacebookReel, publishInstagramReel, instagramQuota, checkPageToken, fbLink, phaseError };
