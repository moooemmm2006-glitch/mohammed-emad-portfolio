// Code node "رفع مؤقت Cloudinary": Instagram needs a public HTTPS URL for the video.
const cloud = lib('cloudinary');
const pipeline = lib('pipeline');
const dry = String($env.DRY_RUN || '').toLowerCase() === 'true';
const items = $input.all().map((i) => i.json);
const needs = items.some((d) => d.platform === 'instagram' && d.status === 'pending');
if (!needs || dry) return items.map((json) => ({ json }));
let up = null;
let err = null;
try {
  const run = items[0].run;
  up = await cloud.uploadVideo({ env: $env, filePath: run.filePath, fileSize: run.fileSize, fileName: run.fileName, mimeType: run.mimeType, publicId: 'run-' + run.runId });
} catch (e) {
  err = e;
}
return items.map((d) => {
  if (d.platform !== 'instagram' || d.status !== 'pending') return { json: Object.assign(d, { cloud: up ? { publicId: up.publicId } : null }) };
  if (err) {
    const f = pipeline.fail(Object.assign({}, d, { platform: 'cloudinary' }), err);
    return { json: Object.assign(f, { platform: 'instagram', errorAr: 'ماقدرتش أرفع الفيديو على Cloudinary: ' + f.errorAr }) };
  }
  return { json: Object.assign(d, { videoUrl: up.url, cloud: { publicId: up.publicId } }) };
});
