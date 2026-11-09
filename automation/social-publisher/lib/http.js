'use strict';
// Minimal HTTP client on top of Node's built-in http/https modules.
//
// Why not this.helpers.httpRequest? Inside the n8n 2.x task runner, a Buffer
// body passed to this.helpers.httpRequest is serialised over the runner RPC
// and arrives as JSON (we measured a 30 MB chunk arriving as 107 MB). Raw
// http/https streams bytes correctly, so every platform call goes through here.
// `fetch` and `URL` are not available in the runner either, hence the manual
// URL parsing below.

const http = require('http');
const https = require('https');
const fs = require('fs');

class HttpError extends Error {
  constructor(message, info) {
    super(message);
    this.name = 'HttpError';
    Object.assign(this, info);
  }
}

function parseUrl(url) {
  const m = /^(https?):\/\/([^/:?#]+)(?::(\d+))?([^#]*)/i.exec(url);
  if (!m) throw new Error('Invalid URL: ' + url);
  const protocol = m[1].toLowerCase();
  return {
    protocol,
    hostname: m[2],
    port: m[3] ? Number(m[3]) : protocol === 'https' ? 443 : 80,
    path: m[4] || '/',
  };
}

function encodeForm(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== null)
    .map((k) => {
      const v = typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : String(obj[k]);
      return encodeURIComponent(k) + '=' + encodeURIComponent(v);
    })
    .join('&');
}

function withQuery(url, query) {
  if (!query) return url;
  const qs = encodeForm(query);
  if (!qs) return url;
  return url + (url.includes('?') ? '&' : '?') + qs;
}

/**
 * request(opts) -> Promise<{status, headers, text, json}>
 * opts: method, url, query, headers, timeoutMs, throwOnError (default true)
 * body (pick one):
 *   json: object            -> application/json
 *   form: object            -> application/x-www-form-urlencoded
 *   body: Buffer|string     -> raw
 *   file: {path, start, end} -> streamed from disk (end inclusive)
 */
function request(opts) {
  const method = (opts.method || 'GET').toUpperCase();
  const url = withQuery(opts.url, opts.query);
  const u = parseUrl(url);
  const headers = Object.assign({}, opts.headers || {});
  let payload = null;
  let fileSpec = null;

  if (opts.json !== undefined) {
    payload = Buffer.from(JSON.stringify(opts.json), 'utf8');
    if (!hasHeader(headers, 'content-type')) headers['Content-Type'] = 'application/json; charset=UTF-8';
  } else if (opts.form !== undefined) {
    payload = Buffer.from(encodeForm(opts.form), 'utf8');
    if (!hasHeader(headers, 'content-type')) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (opts.body !== undefined && opts.body !== null) {
    payload = Buffer.isBuffer(opts.body) ? opts.body : Buffer.from(String(opts.body), 'utf8');
  } else if (opts.file) {
    fileSpec = opts.file;
  }

  if (payload) headers['Content-Length'] = payload.length;
  if (fileSpec) headers['Content-Length'] = fileSpec.end - fileSpec.start + 1;
  if (!payload && !fileSpec && ['POST', 'PUT', 'PATCH'].includes(method) && !hasHeader(headers, 'content-length')) {
    headers['Content-Length'] = 0;
  }

  const lib = u.protocol === 'https' ? https : http;
  const timeoutMs = opts.timeoutMs || 120000;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      { method, hostname: u.hostname, port: u.port, path: u.path, headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch (e) {
            json = null;
          }
          const out = { status: res.statusCode, headers: res.headers, text, json };
          if (res.statusCode >= 400 && opts.throwOnError !== false) {
            reject(
              new HttpError('HTTP ' + res.statusCode + ' from ' + u.hostname, {
                status: res.statusCode,
                body: json || text,
                url: redact(url),
              }),
            );
          } else {
            resolve(out);
          }
        });
        res.on('error', reject);
      },
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy(new HttpError('Request timed out', { code: 'ETIMEDOUT', url: redact(url) }));
    });
    req.on('error', (e) => {
      if (e instanceof HttpError) return reject(e);
      reject(new HttpError(e.message, { code: e.code || 'NETWORK', url: redact(url) }));
    });
    if (fileSpec) {
      const stream = fs.createReadStream(fileSpec.path, { start: fileSpec.start, end: fileSpec.end });
      stream.on('error', (e) => req.destroy(e));
      stream.pipe(req);
    } else {
      req.end(payload || undefined);
    }
  });
}

function hasHeader(headers, name) {
  return Object.keys(headers).some((k) => k.toLowerCase() === name);
}

// Never let tokens end up in logs or error messages.
function redact(str) {
  return String(str).replace(/(access_token|client_secret|refresh_token|api_secret|signature)=[^&\s]+/gi, '$1=***');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { request, HttpError, parseUrl, encodeForm, withQuery, redact, sleep };
