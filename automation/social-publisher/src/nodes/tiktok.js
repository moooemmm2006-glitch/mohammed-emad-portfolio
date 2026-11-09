// Code node "تيك توك": Direct Post, FILE_UPLOAD (chunked), token refresh with rotation.
const tiktok = lib('tiktok');
const pipeline = lib('pipeline');
const dry = String($env.DRY_RUN || '').toLowerCase() === 'true';
const out = [];
for (const it of $input.all()) {
  const d = it.json;
  if (d.platform !== 'tiktok' || d.status !== 'pending') { out.push({ json: d }); continue; }
  if (dry) { out.push({ json: pipeline.mockPublish(d, $env.DRY_RUN_FAIL) }); continue; }
  try {
    const r = await tiktok.publishVideo({
      env: $env, tokenPath: '/files/project/data/tiktok-token.json',
      filePath: d.run.filePath, fileSize: d.run.fileSize, durationSec: d.run.videoInfo && d.run.videoInfo.durationSec,
      title: d.text, privacyLevel: d.privacyLevel, disableComment: d.disableComment, disableDuet: d.disableDuet,
      disableStitch: d.disableStitch, isAigc: d.isAigc, timeoutMs: d.settings.pollTimeoutMinutes * 60000,
    });
    out.push({ json: pipeline.succeed(d, r) });
  } catch (e) {
    out.push({ json: pipeline.fail(d, e) });
  }
}
return out;
