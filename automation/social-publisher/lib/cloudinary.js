'use strict';
// Cloudinary signed upload (+ chunked upload) and destroy, REST only.
// Docs (Nov 2026): "Generating authentication signatures", "Upload API reference",
// "Upload images" -> "Manual chunked upload (REST)".
//   Endpoint: POST https://api.cloudinary.com/v1_1/{cloud_name}/video/upload
//   Signature: sort signed params alphabetically, join "k=v" with "&", append API secret, SHA-1 hex.
//     file, cloud_name, resource_type and api_key are never signed.
//   Files > 100 MB must be chunked: same X-Unique-Upload-Id on every chunk,
//     Content-Range: bytes start-end/total, chunks >= 5 MB except the last.
//   Destroy: POST /v1_1/{cloud}/video/destroy  public_id, timestamp, signature, api_key.

const crypto = require('crypto');
const fs = require('fs');
const { request } = require('./http');
const { PublishError } = require('./errors');

const CHUNK = 20 * 1024 * 1024; // the SDK default chunk size

function sign(params, apiSecret) {
  const str = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => k + '=' + params[k])
    .join('&');
  return crypto.createHash('sha1').update(str + apiSecret).digest('hex');
}

function creds(env) {
  const c = { cloud: env.CLOUDINARY_CLOUD_NAME, key: env.CLOUDINARY_API_KEY, secret: env.CLOUDINARY_API_SECRET };
  if (!c.cloud || !c.key || !c.secret)
    throw new PublishError('CLOUDINARY_MISSING', 'بيانات Cloudinary مش موجودة في .env (إنستجرام محتاجها).', 'حط CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET في .env وأعد التشغيل (README: Cloudinary).');
  c.base = env.MOCK_API_BASE ? env.MOCK_API_BASE + '/cloudinary' : 'https://api.cloudinary.com';
  return c;
}

function multipart(fields, file) {
  const boundary = '----sp' + crypto.randomBytes(12).toString('hex');
  const parts = [];
  for (const k of Object.keys(fields)) {
    parts.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="' + k + '"\r\n\r\n' + fields[k] + '\r\n'));
  }
  if (file) {
    parts.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="' + file.name + '"\r\nContent-Type: ' + (file.type || 'application/octet-stream') + '\r\n\r\n'));
    parts.push(file.data);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from('--' + boundary + '--\r\n'));
  return { body: Buffer.concat(parts), contentType: 'multipart/form-data; boundary=' + boundary };
}

function readSlice(path, start, len) {
  const fd = fs.openSync(path, 'r');
  try {
    const buf = Buffer.alloc(len);
    const n = fs.readSync(fd, buf, 0, len, start);
    return buf.subarray(0, n);
  } finally {
    fs.closeSync(fd);
  }
}

/** Upload a local video. Returns {publicId, url}. */
async function uploadVideo(opts) {
  const http = opts.http || request;
  const c = creds(opts.env || {});
  const size = opts.fileSize || fs.statSync(opts.filePath).size;
  const timestamp = Math.floor((opts.now ? opts.now() : Date.now()) / 1000);
  const signed = { folder: opts.folder || 'social-publisher', public_id: opts.publicId, timestamp };
  const fields = Object.assign({}, signed, { api_key: c.key, signature: sign(signed, c.secret) });
  Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);
  const url = c.base + '/v1_1/' + encodeURIComponent(c.cloud) + '/video/upload';
  const uploadId = crypto.randomBytes(12).toString('hex');
  const chunk = opts.chunkSize || CHUNK;

  let last = null;
  for (let start = 0; start < size; start += chunk) {
    const len = Math.min(chunk, size - start);
    const data = readSlice(opts.filePath, start, len);
    const mp = multipart(fields, { name: opts.fileName || 'video.mp4', type: opts.mimeType || 'video/mp4', data });
    const headers = { 'Content-Type': mp.contentType };
    if (size > chunk) {
      headers['X-Unique-Upload-Id'] = uploadId;
      headers['Content-Range'] = 'bytes ' + start + '-' + (start + len - 1) + '/' + size;
    }
    const r = await http({ method: 'POST', url, headers, body: mp.body, timeoutMs: 15 * 60 * 1000 });
    last = r.json;
  }
  if (!last || !last.secure_url)
    throw new PublishError('CLOUDINARY_UPLOAD', 'Cloudinary ماكملش رفع الفيديو.', 'جرب تاني.', last);
  return { publicId: last.public_id, url: last.secure_url, bytes: last.bytes };
}

async function destroyVideo(opts) {
  const http = opts.http || request;
  const c = creds(opts.env || {});
  const timestamp = Math.floor((opts.now ? opts.now() : Date.now()) / 1000);
  const signed = { invalidate: 'true', public_id: opts.publicId, timestamp };
  const r = await http({
    method: 'POST',
    url: c.base + '/v1_1/' + encodeURIComponent(c.cloud) + '/video/destroy',
    form: Object.assign({}, signed, { api_key: c.key, signature: sign(signed, c.secret) }),
  });
  return r.json; // {result: "ok"} or {result: "not found"}
}

module.exports = { sign, uploadVideo, destroyVideo, multipart, CHUNK };
