'use strict';
// Mock of the platform APIs, shaped after the request/response examples in the
// official docs (Meta Reels Publishing + IG Content Publishing v27.0, TikTok
// Content Posting, YouTube resumable upload, Cloudinary Upload API, Telegram).
// Used by unit tests and by the n8n end-to-end test (MOCK_API_BASE).
//
// Special values:
//   access token "EXPIRED"          -> Meta error 190
//   IG user id "999"                -> publishing quota reached
//   YouTube Authorization "Bearer quota" -> quotaExceeded

const http = require('http');
const crypto = require('crypto');

const CLOUD_SECRET = 'mock-secret';

function createMock() {
  const log = [];
  const state = { polls: {}, uploads: {}, chunks: {}, tiktokRefresh: 0 };
  let base = '';

  function send(res, status, obj, headers) {
    res.writeHead(status, Object.assign({ 'Content-Type': 'application/json' }, headers || {}));
    res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
  }
  function qs(str) {
    const o = {};
    for (const p of String(str || '').split('&')) {
      const i = p.indexOf('=');
      if (i > 0) o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' '));
    }
    return o;
  }
  function params(req, body) {
    const q = qs(req.url.split('?')[1]);
    const ct = req.headers['content-type'] || '';
    if (ct.includes('json')) Object.assign(q, body.length ? JSON.parse(body.toString()) : {});
    else if (ct.includes('x-www-form-urlencoded')) Object.assign(q, qs(body.toString()));
    return q;
  }
  function multipartFields(req, body) {
    const m = /boundary=(.+)$/.exec(req.headers['content-type'] || '');
    const out = { fields: {}, fileBytes: 0 };
    if (!m) return out;
    const parts = body.toString('latin1').split('--' + m[1]);
    for (const p of parts) {
      const nm = /name="([^"]+)"(; filename="[^"]*")?/.exec(p);
      if (!nm) continue;
      const val = p.slice(p.indexOf('\r\n\r\n') + 4, p.length - 2);
      if (nm[2]) out.fileBytes = Buffer.byteLength(val, 'latin1');
      else out.fields[nm[1]] = Buffer.from(val, 'latin1').toString('utf8');
    }
    return out;
  }
  const metaExpired = { error: { message: 'Error validating access token: Session has expired.', type: 'OAuthException', code: 190, error_subcode: 463, fbtrace_id: 'mock' } };

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const path = req.url.split('?')[0];
      const entry = { method: req.method, path, headers: req.headers, bodyBytes: body.length };
      log.push(entry);
      try {
        route(req, res, path, body, entry);
      } catch (e) {
        send(res, 500, { error: { message: 'mock crashed: ' + e.message } });
      }
    });
  });

  function route(req, res, path, body, entry) {
    let m;
    if (path === '/__log') return send(res, 200, log.map((l) => ({ method: l.method, path: l.path, bodyBytes: l.bodyBytes, params: l.params })));
    if (path === '/__reset') {
      log.length = 0;
      return send(res, 200, { ok: true });
    }

    // ---------- Meta Graph ----------
    if ((m = /^\/graph\/v\d+\.\d+\/(\d+)\/video_reels$/.exec(path)) && req.method === 'POST') {
      const p = params(req, body);
      entry.params = p;
      if (p.access_token === 'EXPIRED') return send(res, 400, metaExpired);
      if (p.upload_phase === 'start') {
        const id = 'v' + crypto.randomBytes(4).toString('hex');
        return send(res, 200, { video_id: id, upload_url: base + '/rupload/video-upload/' + id });
      }
      if (p.upload_phase === 'finish') {
        if (!p.video_id || p.video_state !== 'PUBLISHED') return send(res, 400, { error: { code: 100, message: '(#100) Missing parameter: video_id' } });
        state.uploads[p.video_id] = Object.assign(state.uploads[p.video_id] || {}, { finished: true, description: p.description });
        return send(res, 200, { success: true });
      }
      return send(res, 400, { error: { code: 100, message: '(#100) Missing parameter: upload_phase' } });
    }
    if ((m = /^\/rupload\/video-upload\/v\d+\.\d+\/(\w+)$/.exec(path))) {
      const auth = req.headers.authorization || '';
      if (!/^OAuth .+/.test(auth)) return send(res, 401, { debug_info: { type: 'AuthError', message: 'missing OAuth' } });
      if (Number(req.headers.file_size) !== body.length || req.headers.offset !== '0')
        return send(res, 400, { debug_info: { retriable: false, type: 'PartialRequestError', message: 'Partial request (did not match length of file)' } });
      state.uploads[m[1]] = { bytes: body.length };
      return send(res, 200, { success: true });
    }
    if ((m = /^\/graph\/v\d+\.\d+\/(\d+)\/content_publishing_limit$/.exec(path))) {
      const p = params(req, body);
      if (p.access_token === 'EXPIRED') return send(res, 400, metaExpired);
      return send(res, 200, { data: [{ quota_usage: m[1] === '999' ? 50 : 2, config: { quota_total: 50, quota_duration: 86400 } }] });
    }
    if ((m = /^\/graph\/v\d+\.\d+\/(\d+)\/media$/.exec(path)) && req.method === 'POST') {
      const p = params(req, body);
      entry.params = p;
      if (p.access_token === 'EXPIRED') return send(res, 400, metaExpired);
      if (p.media_type !== 'REELS' || !/^https?:\/\//.test(p.video_url || '')) return send(res, 400, { error: { code: 100, message: 'Invalid parameter' } });
      return send(res, 200, { id: 'c' + crypto.randomBytes(4).toString('hex') });
    }
    if ((m = /^\/graph\/v\d+\.\d+\/(\d+)\/media_publish$/.exec(path)) && req.method === 'POST') {
      const p = params(req, body);
      entry.params = p;
      if (!p.creation_id) return send(res, 400, { error: { code: 100, message: 'Missing creation_id' } });
      return send(res, 200, { id: 'm' + p.creation_id.slice(1) });
    }
    if ((m = /^\/graph\/v\d+\.\d+\/(\w+)$/.exec(path)) && req.method === 'GET') {
      const p = params(req, body);
      const id = m[1];
      if (p.access_token === 'EXPIRED') return send(res, 400, metaExpired);
      const n = (state.polls[id] = (state.polls[id] || 0) + 1);
      if (id.startsWith('v')) {
        const done = n >= 2;
        return send(res, 200, {
          id,
          permalink_url: '/reel/' + id,
          status: {
            video_status: done ? 'ready' : 'processing',
            uploading_phase: { status: 'complete' },
            processing_phase: { status: done ? 'complete' : 'in_progress' },
            publishing_phase: { status: done ? 'complete' : 'not_started' },
          },
        });
      }
      if (id.startsWith('c')) return send(res, 200, { id, status_code: n >= 2 ? 'FINISHED' : 'IN_PROGRESS' });
      if (id.startsWith('m')) return send(res, 200, { id, permalink: 'https://www.instagram.com/reel/' + id + '/' });
      if (/^\d+$/.test(id)) return send(res, 200, { id, name: 'Mock ' + id, instagram_business_account: { id: '1784' + id } });
      return send(res, 404, { error: { code: 803, message: 'Unknown object' } });
    }

    // ---------- Cloudinary ----------
    if ((m = /^\/cloudinary\/v1_1\/([^/]+)\/video\/(upload|destroy)$/.exec(path))) {
      const isUpload = m[2] === 'upload';
      const f = isUpload ? multipartFields(req, body) : { fields: params(req, body) };
      entry.params = f.fields;
      const signed = Object.assign({}, f.fields);
      for (const k of ['file', 'api_key', 'signature', 'cloud_name', 'resource_type']) delete signed[k];
      const str = Object.keys(signed).sort().map((k) => k + '=' + signed[k]).join('&');
      const expect = crypto.createHash('sha1').update(str + CLOUD_SECRET).digest('hex');
      if (f.fields.signature !== expect) return send(res, 401, { error: { message: 'Invalid Signature ' + f.fields.signature + '. String to sign - \'' + str + '\'.' } });
      if (!isUpload) return send(res, 200, { result: 'ok' });
      const range = req.headers['content-range'];
      const pid = (f.fields.folder ? f.fields.folder + '/' : '') + (f.fields.public_id || 'auto' + crypto.randomBytes(3).toString('hex'));
      if (range) {
        const r = /bytes (\d+)-(\d+)\/(\d+)/.exec(range);
        const uid = req.headers['x-unique-upload-id'];
        state.chunks[uid] = (state.chunks[uid] || 0) + f.fileBytes;
        if (Number(r[2]) + 1 < Number(r[3])) return send(res, 200, { done: false });
        if (state.chunks[uid] !== Number(r[3])) return send(res, 400, { error: { message: 'chunk bytes mismatch' } });
      }
      return send(res, 200, { public_id: pid, secure_url: base + '/files/' + pid + '.mp4', bytes: f.fileBytes, resource_type: 'video', done: true });
    }

    // ---------- TikTok ----------
    if (path === '/tiktok/v2/oauth/token/') {
      const p = params(req, body);
      entry.params = Object.assign({}, p, { client_secret: '***' });
      if (!p.client_key || !p.client_secret) return send(res, 400, { error: 'invalid_request', error_description: 'client_key missing' });
      if (p.grant_type === 'refresh_token' && p.refresh_token === 'rft.revoked') return send(res, 400, { error: 'invalid_grant', error_description: 'Refresh token is invalid or expired.' });
      state.tiktokRefresh++;
      return send(res, 200, { access_token: 'act.mock' + state.tiktokRefresh, expires_in: 7200, open_id: 'open-1', refresh_expires_in: 15552000, refresh_token: 'rft.mock' + state.tiktokRefresh, scope: 'user.info.basic,video.publish', token_type: 'Bearer' });
    }
    if (path.startsWith('/tiktok/v2/post/publish/')) {
      const auth = req.headers.authorization || '';
      if (!/^Bearer act\./.test(auth)) return send(res, 401, { error: { code: 'access_token_invalid', message: 'The access token is invalid or not found in the request.', log_id: 'mock' } });
      const ok = { code: 'ok', message: '', log_id: 'mock' };
      if (path.endsWith('/creator_info/query/'))
        return send(res, 200, { data: { creator_username: 'mock.creator', creator_nickname: 'Mock Creator', privacy_level_options: ['FOLLOWER_OF_CREATOR', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'], comment_disabled: false, duet_disabled: true, stitch_disabled: true, max_video_post_duration_sec: 180 }, error: ok });
      if (path.endsWith('/video/init/')) {
        const p = JSON.parse(body.toString());
        entry.params = p;
        const si = p.source_info || {};
        if (si.source !== 'FILE_UPLOAD') return send(res, 400, { error: { code: 'invalid_param', message: 'source', log_id: 'mock' } });
        if (si.total_chunk_count !== Math.floor(si.video_size / si.chunk_size)) return send(res, 400, { error: { code: 'invalid_param', message: 'total_chunk_count mismatch', log_id: 'mock' } });
        if (!['FOLLOWER_OF_CREATOR', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'].includes(p.post_info.privacy_level)) return send(res, 403, { error: { code: 'privacy_level_option_mismatch', message: 'x', log_id: 'mock' } });
        const id = 'v_pub_file~v2-1.' + crypto.randomBytes(4).toString('hex');
        state.uploads[id] = { size: si.video_size, got: 0 };
        return send(res, 200, { data: { publish_id: id, upload_url: base + '/tiktok-upload/?upload_id=' + encodeURIComponent(id) + '&upload_token=x' }, error: ok });
      }
      if (path.endsWith('/status/fetch/')) {
        const p = JSON.parse(body.toString());
        const n = (state.polls[p.publish_id] = (state.polls[p.publish_id] || 0) + 1);
        return send(res, 200, { data: { status: n >= 2 ? 'PUBLISH_COMPLETE' : 'PROCESSING_UPLOAD', publicaly_available_post_id: [], uploaded_bytes: (state.uploads[p.publish_id] || {}).got }, error: ok });
      }
    }
    if (path === '/tiktok-upload/' && req.method === 'PUT') {
      const id = qs(req.url.split('?')[1]).upload_id;
      const u = state.uploads[id];
      const r = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(req.headers['content-range'] || '');
      if (!u || !r) return send(res, 404, '');
      if (Number(r[1]) !== u.got || Number(r[2]) - Number(r[1]) + 1 !== body.length) return send(res, 416, '');
      u.got += body.length;
      return send(res, u.got >= u.size ? 201 : 206, '');
    }

    // ---------- YouTube ----------
    if (path === '/youtube/upload/youtube/v3/videos' && req.method === 'POST') {
      const auth = req.headers.authorization || '';
      if (auth === 'Bearer quota') return send(res, 403, { error: { code: 403, message: 'The request cannot be completed because you have exceeded your quota.', errors: [{ reason: 'quotaExceeded' }] } });
      entry.params = JSON.parse(body.toString() || '{}');
      if (!req.headers['x-upload-content-length']) return send(res, 400, { error: { code: 400, message: 'missing X-Upload-Content-Length' } });
      return send(res, 200, '', { Location: base + '/youtube/session/' + crypto.randomBytes(4).toString('hex') });
    }
    if (path.startsWith('/youtube/session/') && req.method === 'PUT') {
      return send(res, 200, { kind: 'youtube#video', id: 'yt' + crypto.randomBytes(4).toString('hex'), status: { uploadStatus: 'uploaded' } });
    }

    // ---------- Telegram ----------
    if ((m = /^\/telegram\/bot([^/]+)\/sendMessage$/.exec(path))) {
      entry.params = params(req, body);
      return send(res, 200, { ok: true, result: { message_id: 1 } });
    }
    if (path.startsWith('/files/')) return send(res, 200, 'video-bytes', { 'Content-Type': 'video/mp4' });

    send(res, 404, { error: { message: 'mock: no route for ' + req.method + ' ' + path } });
  }

  return {
    server,
    log,
    state,
    listen(port, host) {
      return new Promise((r) =>
        server.listen(port || 0, host || '127.0.0.1', () => {
          base = 'http://' + (host || '127.0.0.1') + ':' + server.address().port;
          r(base);
        }),
      );
    },
    close() {
      return new Promise((r) => server.close(r));
    },
  };
}

module.exports = { createMock, CLOUD_SECRET };

if (require.main === module) {
  const port = Number(process.argv[2] || 9999);
  createMock()
    .listen(port, '127.0.0.1')
    .then((b) => console.log('mock API listening on ' + b));
}
