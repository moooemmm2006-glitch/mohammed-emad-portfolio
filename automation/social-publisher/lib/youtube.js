'use strict';
// YouTube Data API v3 resumable upload helpers. The HTTP calls themselves run in
// n8n HTTP Request nodes so that n8n's "YouTube OAuth2 API" credential handles
// the Google token and its refresh.
// Docs (Nov 2026): videos.insert, "Resumable uploads", videos resource.
//   Step 1: POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
//           headers X-Upload-Content-Length, X-Upload-Content-Type; body = video resource -> 200 + Location header
//   Step 2: PUT {Location} with the file bytes -> 200/201 + video resource (id)
//   Quota: videos.insert has its own bucket, 100 calls/day by default, cost 1 per call.
//   Title <= 100 chars, description <= 5000 bytes, neither may contain < or >.

function buildVideoResource({ title, description, privacyStatus, categoryId, madeForKids, containsSyntheticMedia }) {
  return {
    snippet: { title, description, categoryId: String(categoryId || '22') },
    status: {
      privacyStatus: privacyStatus || 'public',
      selfDeclaredMadeForKids: !!madeForKids,
      containsSyntheticMedia: !!containsSyntheticMedia,
    },
  };
}

function initUrl(env) {
  const base = env && env.MOCK_API_BASE ? env.MOCK_API_BASE + '/youtube' : 'https://www.googleapis.com';
  return base + '/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
}

function shortsLink(id) {
  return 'https://www.youtube.com/shorts/' + id;
}

/** n8n HTTP Request node output (full response, never error) -> {ok, location, error} */
// With "continue on error", a node-level failure (e.g. no credential selected)
// arrives as {error: "..."} or {error: {message}} instead of an HTTP response.
function nodeError(res) {
  if (res && res.error && !res.statusCode) {
    const message = typeof res.error === 'string' ? res.error : res.error.message || JSON.stringify(res.error);
    return { ok: false, error: { status: 0, nodeError: true, body: { error: { message } } } };
  }
  return null;
}

function parseInitResponse(res) {
  const ne = nodeError(res);
  if (ne) return ne;
  const status = Number(res.statusCode || res.status || 0);
  const headers = res.headers || {};
  const location = headers.location || headers.Location;
  if (status >= 200 && status < 300 && location) return { ok: true, location };
  return { ok: false, error: { status: status || 500, body: parseBody(res.body) } };
}

function parseUploadResponse(res) {
  const ne = nodeError(res);
  if (ne) return ne;
  const status = Number(res.statusCode || res.status || 0);
  const body = parseBody(res.body);
  if (status >= 200 && status < 300 && body && body.id) return { ok: true, id: body.id, link: shortsLink(body.id) };
  return { ok: false, error: { status: status || 500, body } };
}

function parseBody(b) {
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch (e) {
      return { error: { message: b.slice(0, 300) } };
    }
  }
  return b || {};
}

module.exports = { buildVideoResource, initUrl, shortsLink, parseInitResponse, parseUploadResponse };
