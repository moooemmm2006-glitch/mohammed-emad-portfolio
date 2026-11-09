// Code node "يوتيوب: فحص البداية" (run once for each item)
const yt = lib('youtube');
const pipeline = lib('pipeline');
const d = $('يوتيوب: تجهيز').item.json;
const r = yt.parseInitResponse($json);
if (r.ok) return { json: Object.assign({}, d, { ytUploadUrl: r.location }) };
return { json: Object.assign(pipeline.fail(d, r.error), { ytUploadUrl: '' }) };
