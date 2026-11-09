// Code node "يوتيوب: تجهيز": dry-run mock, or prepare the resumable-upload request.
const yt = lib('youtube');
const pipeline = lib('pipeline');
const dry = String($env.DRY_RUN || '').toLowerCase() === 'true';
return $input.all().map((it) => {
  const d = it.json;
  if (d.platform !== 'youtube' || d.status !== 'pending') return { json: d };
  if (dry) return { json: pipeline.mockPublish(d, $env.DRY_RUN_FAIL) };
  return {
    json: Object.assign(d, {
      ytUpload: true,
      ytInitUrl: yt.initUrl($env),
      ytResource: yt.buildVideoResource({ title: d.title, description: d.text, privacyStatus: d.privacyStatus, categoryId: d.categoryId, madeForKids: d.madeForKids, containsSyntheticMedia: d.containsSyntheticMedia }),
    }),
  };
});
