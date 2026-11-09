// Code node "إنستجرام": container -> poll -> publish -> permalink, for each selected account.
const meta = lib('meta');
const pipeline = lib('pipeline');
const { PublishError } = lib('errors');
const dry = String($env.DRY_RUN || '').toLowerCase() === 'true';
const out = [];
for (const it of $input.all()) {
  const d = it.json;
  if (d.platform !== 'instagram' || d.status !== 'pending') { out.push({ json: d }); continue; }
  if (dry) { out.push({ json: pipeline.mockPublish(d, $env.DRY_RUN_FAIL) }); continue; }
  try {
    const token = $env[d.tokenEnv];
    if (!token) throw new PublishError('TOKEN_MISSING', 'التوكن ' + d.tokenEnv + ' مش موجود في .env.', 'حط توكن الصفحة المربوطة بالحساب في .env باسم ' + d.tokenEnv + ' وأعد التشغيل.');
    const r = await meta.publishInstagramReel({
      env: $env, version: d.settings.graphApiVersion, igUserId: d.igUserId, token,
      videoUrl: d.videoUrl, caption: d.text, shareToFeed: d.settings.igShareToFeed,
      timeoutMs: d.settings.pollTimeoutMinutes * 60000,
    });
    out.push({ json: pipeline.succeed(d, r) });
  } catch (e) {
    out.push({ json: pipeline.fail(d, e, { tokenEnv: d.tokenEnv }) });
  }
}
return out;
