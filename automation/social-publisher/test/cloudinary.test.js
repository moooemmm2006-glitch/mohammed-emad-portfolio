'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createMock, CLOUD_SECRET } = require('./mock-server');
const cl = require('../lib/cloudinary');

test('signature matches the examples in the Cloudinary docs', () => {
  assert.strictEqual(cl.sign({ timestamp: 1315060510 }, 'abcd'), 'a21ad0f63beb4de2e5575204b79ab90bffb02c10');
  assert.strictEqual(cl.sign({ eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }, 'abcd'), 'bfd09f95f331f558cbd1320e67aa8d488770583e');
});

test('upload (single + chunked) and destroy against mock', async (t) => {
  const mock = createMock();
  const base = await mock.listen();
  t.after(() => mock.close());
  const env = { MOCK_API_BASE: base, CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: '123', CLOUDINARY_API_SECRET: CLOUD_SECRET };

  const small = path.join(__dirname, 'fixtures', 'vertical_5s.mp4');
  const r = await cl.uploadVideo({ env, filePath: small, publicId: 'run1' });
  assert.strictEqual(r.publicId, 'social-publisher/run1');
  assert.match(r.url, /\/files\/social-publisher\/run1\.mp4$/);
  assert.strictEqual(r.bytes, fs.statSync(small).size);

  const big = path.join(os.tmpdir(), 'sp-chunk-test.bin');
  fs.writeFileSync(big, Buffer.alloc(2_500_000, 7));
  const rc = await cl.uploadVideo({ env, filePath: big, publicId: 'run2', chunkSize: 1_000_000 });
  assert.strictEqual(rc.publicId, 'social-publisher/run2');
  const parts = mock.log.filter((l) => l.headers['content-range']);
  assert.deepStrictEqual(parts.map((p) => p.headers['content-range']), ['bytes 0-999999/2500000', 'bytes 1000000-1999999/2500000', 'bytes 2000000-2499999/2500000']);
  assert.strictEqual(new Set(parts.map((p) => p.headers['x-unique-upload-id'])).size, 1);
  fs.unlinkSync(big);

  assert.deepStrictEqual(await cl.destroyVideo({ env, publicId: r.publicId }), { result: 'ok' });

  await assert.rejects(cl.uploadVideo({ env: Object.assign({}, env, { CLOUDINARY_API_SECRET: 'wrong' }), filePath: small }), (e) => e.status === 401);
  await assert.rejects(cl.uploadVideo({ env: {}, filePath: small }), (e) => e.code === 'CLOUDINARY_MISSING');
});
