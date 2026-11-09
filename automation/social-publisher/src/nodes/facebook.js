// Code node "فيسبوك": publish a Reel on every selected Page.
const meta = lib('meta');
const pipeline = lib('pipeline');
const { PublishError } = lib('errors');
const dry = String($env.DRY_RUN || '').toLowerCase() === 'true';
const out = [];
for (const it of $input.all()) {
  const d = it.json;
  if (d.platform !== 'facebook' || d.status !== 'pending') { out.push({ json: d }); continue; }
  if (dry) { out.push({ json: pipeline.mockPublish(d, $env.DRY_RUN_FAIL) }); continue; }
  try {
    const token = $env[d.tokenEnv];
    if (!token) throw new PublishError('TOKEN_MISSING', 'التوكن ' + d.tokenEnv + ' مش موجود في .env.', 'حط توكن الصفحة في .env باسم ' + d.tokenEnv + ' وشغّل stop.bat ثم start.bat.');
    const r = await meta.publishFacebookReel({
      env: $env, version: d.settings.graphApiVersion, pageId: d.pageId, token,
      filePath: d.run.filePath, fileSize: d.run.fileSize, description: d.text,
      timeoutMs: d.settings.pollTimeoutMinutes * 60000,
    });
    out.push({ json: pipeline.succeed(d, r) });
  } catch (e) {
    out.push({ json: pipeline.fail(d, e, { tokenEnv: d.tokenEnv }) });
  }
}
return out;
