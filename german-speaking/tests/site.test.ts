import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import ar from "../messages/ar.json";
import { resetDbForTests } from "@/lib/db";
import { addVlog, channelClicks, checkChannelPhoto, deleteVlog, getSiteLinks, listVlogs, recordChannelClick, saveSiteLinks } from "@/lib/site";
import { DEFAULT_CHANNEL_URL, isOwnChannel, localDay, parseChannelUrl, parsePlaylistId, parseYouTubeId, shouldOfferPause } from "@/lib/siteShared";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { getUser, signUp, type UserRow } from "@/lib/auth/users";

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));
const siteRoute = await import("@/app/api/admin/site/route");
const vlogsAdminRoute = await import("@/app/api/admin/vlogs/route");
const vlogsRoute = await import("@/app/api/vlogs/route");
const clickRoute = await import("@/app/api/channel/click/route");
const settingsRoute = await import("@/app/api/settings/route");
const meRoute = await import("@/app/api/me/route");

const PNG = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString("base64");

describe("link formats", () => {
  it("cleans channel links (no ?si=) and rejects anything that isn't a channel", () => {
    expect(parseChannelUrl("https://www.youtube.com/@mohammedemad-ilden?si=abc123")).toBe(DEFAULT_CHANNEL_URL);
    expect(parseChannelUrl("youtube.com/@mohammedemad-ilden/videos")).toBe(DEFAULT_CHANNEL_URL);
    expect(parseChannelUrl("@mohammedemad-ilden")).toBe(DEFAULT_CHANNEL_URL);
    expect(parseChannelUrl("https://m.youtube.com/channel/UCwjFZpJ56bU7SdkMGlFuqQw")).toBe("https://www.youtube.com/channel/UCwjFZpJ56bU7SdkMGlFuqQw");
    for (const bad of ["https://www.youtube.com/watch?v=qALULLsNpbc", "https://evil.com/@mohammedemad-ilden", "hallo", ""]) expect(parseChannelUrl(bad), bad).toBeNull();
  });

  it("reads video IDs (youtu.be with ?si=) and playlist IDs", () => {
    expect(parseYouTubeId("https://youtu.be/qALULLsNpbc?si=XyZ")).toBe("qALULLsNpbc");
    expect(parsePlaylistId("https://www.youtube.com/playlist?list=PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg")).toBe("PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg");
    expect(parsePlaylistId("https://www.youtube.com/watch?v=qALULLsNpbc&list=PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg&index=2")).toBe("PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg");
    for (const bad of ["https://www.youtube.com/watch?v=qALULLsNpbc", "https://evil.com/playlist?list=PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg", "list=short"]) expect(parsePlaylistId(bad), bad).toBeNull();
  });

  it("knows the owner's channel (by handle or by channel ID)", () => {
    expect(isOwnChannel("https://www.youtube.com/@mohammedemad-ilden", DEFAULT_CHANNEL_URL)).toBe(true);
    expect(isOwnChannel("https://www.youtube.com/channel/UCwjFZpJ56bU7SdkMGlFuqQw", DEFAULT_CHANNEL_URL)).toBe(true);
    expect(isOwnChannel("https://www.youtube.com/@EasyGerman", DEFAULT_CHANNEL_URL)).toBe(false);
  });

  it("offers a break at most once a day", () => {
    const today = localDay(new Date(2026, 9, 28, 23, 30));
    expect(today).toBe("2026-10-28");
    expect(shouldOfferPause(null, today)).toBe(true);
    expect(shouldOfferPause("2026-10-27", today)).toBe(true);
    expect(shouldOfferPause(today, today)).toBe(false);
  });

  it("has the texts the owner asked for", () => {
    expect(ar.yt_creator_line).toBe("صاحب الموقع – بشارك شروحات وتجارب في تعلم اللغات على يوتيوب");
    expect(ar.yt_follow).toBe("تابعني على يوتيوب");
    expect(ar.pause_intro).toBe("خلّصت مذاكرة أو زهقت؟ خد استراحة واتفرج على تجاربي في معهد جوته الألماني (Goethe-Institut).");
    expect(ar.pause_intro).not.toContain("ألمانيا"); // the owner hasn't travelled to Germany
    expect(ar.yt_strip).toBe("أول مرة هنا؟ ▶️ شوف شرح الموقع في دقيقتين");
  });
});

describe("site settings, vlogs and clicks", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-site-"));
  let n = 0;
  let admin: UserRow;
  let student: UserRow;
  const as = async (u: UserRow) => {
    cookie = await signToken({ u: u.id, v: (await getUser(u.id))!.tokenVersion, e: Date.now() + 60_000 });
  };
  const send = (method: string, body?: unknown) => new Request("http://test/x", { method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const code = async (r: Response) => ((await r.json()) as { error?: { code: string } }).error?.code;
  beforeEach(async () => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `s${n++}.db`);
    cookie = undefined;
    admin = await signUp({ name: "Mohamed", username: "mohamed", password: "geheim123" });
    student = await signUp({ name: "Sara", username: "sara", password: "geheim123" });
  });
  afterEach(() => vi.unstubAllGlobals());
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("the channel is prefilled; the explainer and playlist stay hidden until saved; removing stays removed", async () => {
    expect(await getSiteLinks()).toEqual({ channelUrl: DEFAULT_CHANNEL_URL, explainerId: null, playlistId: null, channelPhoto: null });
    await saveSiteLinks({ explainerId: "abcdefghijk", playlistId: "PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg" });
    expect(await getSiteLinks()).toMatchObject({ explainerId: "abcdefghijk", playlistId: "PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg" });
    await saveSiteLinks({ channelUrl: null, explainerId: null });
    expect(await getSiteLinks()).toMatchObject({ channelUrl: null, explainerId: null, playlistId: "PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg" });
    expect(checkChannelPhoto(PNG)).toBe(PNG);
    expect(checkChannelPhoto("data:image/png;base64," + Buffer.from("<svg onload=alert(1)>").toString("base64"))).toBeNull();
    expect(checkChannelPhoto("data:image/svg+xml;base64,AAAA")).toBeNull();
  });

  it("the admin API: admin only, validates every link and saves them", async () => {
    expect((await siteRoute.GET()).status).toBe(401);
    await as(student);
    expect((await siteRoute.PUT(send("PUT", { explainer: "https://youtu.be/abcdefghijk" }))).status).toBe(403);
    await as(admin);
    expect(await code(await siteRoute.PUT(send("PUT", { channelUrl: "https://evil.com/@x" })))).toBe("invalid_channel");
    expect(await code(await siteRoute.PUT(send("PUT", { explainer: "https://youtu.be/short" })))).toBe("invalid_video");
    expect(await code(await siteRoute.PUT(send("PUT", { playlist: "https://www.youtube.com/playlist?list=x" })))).toBe("invalid_playlist");
    expect(await code(await siteRoute.PUT(send("PUT", { channelPhoto: "data:text/html;base64,AAAA" })))).toBe("invalid_photo");
    const ok = (await (await siteRoute.PUT(send("PUT", { channelUrl: "https://www.youtube.com/@mohammedemad-ilden?si=tracking", explainer: "https://youtu.be/abcdefghijk?si=1", channelPhoto: PNG }))).json()) as { links: Record<string, string | null> };
    expect(ok.links).toEqual({ channelUrl: DEFAULT_CHANNEL_URL, explainerId: "abcdefghijk", playlistId: null, channelPhoto: PNG });
    const removed = (await (await siteRoute.PUT(send("PUT", { explainer: "" }))).json()) as { links: Record<string, string | null> };
    expect(removed.links.explainerId).toBeNull();
  });

  it("vlogs: the first one is seeded once, newest first, deleted ones stay deleted", async () => {
    expect((await listVlogs()).map((v) => v.youtubeId)).toEqual(["qALULLsNpbc"]);
    expect((await listVlogs())[0].title).toBe("vlog in Goethe 🇩🇪");
    await addVlog({ youtubeId: "zzzzzzzzzzz", title: "Neu", description_ar: "جديد" }, Date.now() + 1000);
    expect((await listVlogs()).map((v) => v.youtubeId)).toEqual(["zzzzzzzzzzz", "qALULLsNpbc"]);
    expect(await deleteVlog("qALULLsNpbc")).toBe(true);
    expect((await listVlogs()).map((v) => v.youtubeId)).toEqual(["zzzzzzzzzzz"]);
  });

  it("adding a vlog only accepts videos of the owner's channel (checked with YouTube)", async () => {
    await as(student);
    expect((await vlogsRoute.GET()).status).toBe(200);
    expect((await vlogsAdminRoute.POST(send("POST", { link: "https://youtu.be/abcdefghijk" }))).status).toBe(403);
    await as(admin);
    const oembed = (author_url: string, status = 200) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ title: "Mein Tag", author_name: "x", author_url }), { status })));
    oembed("https://www.youtube.com/@EasyGerman");
    expect(await code(await vlogsAdminRoute.POST(send("POST", { link: "https://youtu.be/abcdefghijk" })))).toBe("not_my_channel");
    oembed("", 404);
    expect(await code(await vlogsAdminRoute.POST(send("POST", { link: "https://youtu.be/abcdefghijk" })))).toBe("video_not_found");
    expect(await code(await vlogsAdminRoute.POST(send("POST", { link: "not a link" })))).toBe("invalid_video");
    oembed("https://www.youtube.com/@mohammedemad-ilden");
    const added = (await (await vlogsAdminRoute.POST(send("POST", { link: "https://youtu.be/abcdefghijk?si=q", description_ar: "يوم في برلين" }))).json()) as { vlogs: { youtubeId: string; title: string; description_ar: string }[] };
    expect(added.vlogs[0]).toMatchObject({ youtubeId: "abcdefghijk", title: "Mein Tag", description_ar: "يوم في برلين" });
    // YouTube unreachable: the admin's own link is accepted.
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect((await vlogsAdminRoute.POST(send("POST", { link: "https://youtu.be/yyyyyyyyyyy" }))).status).toBe(200);
    expect((await vlogsAdminRoute.DELETE(send("DELETE", { youtubeId: "yyyyyyyyyyy" }))).status).toBe(200);
    expect((await vlogsAdminRoute.DELETE(send("DELETE", { youtubeId: "yyyyyyyyyyy" }))).status).toBe(404);
  });

  it("counts channel clicks per place (shown on the admin page)", async () => {
    expect((await clickRoute.POST(send("POST", { place: "footer" }))).status).toBe(401);
    await as(student);
    expect((await clickRoute.POST(send("POST", { place: "footer" }))).status).toBe(200);
    expect((await clickRoute.POST(send("POST", { place: "footer" }))).status).toBe(200);
    expect((await clickRoute.POST(send("POST", { place: "nowhere" }))).status).toBe(400);
    await recordChannelClick("pause");
    expect(await channelClicks()).toMatchObject({ total: 3, byPlace: { footer: 2, pause: 1, menu: 0 } });
    await as(admin);
    const d = (await (await siteRoute.GET()).json()) as { clicks: { total: number } };
    expect(d.clicks.total).toBe(3);
  });

  it("explainer seen / strip closed / break offered are remembered per account", async () => {
    await as(student);
    const prefs = async () => ((await (await meRoute.GET(new Request("http://test/api/me"))).json()) as { prefs: Record<string, unknown> }).prefs;
    expect(await prefs()).toMatchObject({ explainerSeen: false, introDismissed: false, pauseOfferDay: null });
    await settingsRoute.PUT(new Request("http://test/api/settings", { method: "PUT", body: JSON.stringify({ explainerSeen: true, introDismissed: true, pauseOfferDay: "2026-10-28" }) }));
    expect(await prefs()).toMatchObject({ explainerSeen: true, introDismissed: true, pauseOfferDay: "2026-10-28" });
    // Saving one setting never resets the others (it used to bring back the defaults).
    await settingsRoute.PUT(new Request("http://test/api/settings", { method: "PUT", body: JSON.stringify({ uiLang: "de" }) }));
    await settingsRoute.PUT(new Request("http://test/api/settings", { method: "PUT", body: JSON.stringify({ effects: "off" }) }));
    expect(await prefs()).toMatchObject({ uiLang: "de", effects: "off", explainerSeen: true, introDismissed: true, pauseOfferDay: "2026-10-28" });
    await as(admin);
    expect(await prefs()).toMatchObject({ explainerSeen: false });
  });
});
