// Code node "يوتيوب: النتيجة" (run once for each item)
const yt = lib('youtube');
const pipeline = lib('pipeline');
const d = $('يوتيوب: فحص البداية').item.json;
const r = yt.parseUploadResponse($json);
return { json: r.ok ? pipeline.succeed(d, { id: r.id, link: r.link }) : pipeline.fail(d, r.error) };
