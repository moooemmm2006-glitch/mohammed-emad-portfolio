import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import file from "../data/easy-german-videos.json";
import { getTopicByNumber } from "@/lib/book";
import { resetDbForTests } from "@/lib/db";
import { adminAddVideo, adminRemoveVideo, easyGermanTopicNumbers, getEasyGermanVideos, hiddenVideos, parseEasyGermanFile, topicVideos } from "@/lib/easyGerman";
import { easyGermanSearchUrl, egKey, parseYouTubeId } from "@/lib/easyGermanShared";
import { saveVideoProgress } from "@/lib/videoProgress";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { getUser, signUp, type UserRow } from "@/lib/auth/users";

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));
const topicRoute = await import("@/app/api/videos/topic/[n]/route");
const adminRoute = await import("@/app/api/admin/topic-videos/route");
const levelRoute = await import("@/app/api/book/level/[level]/route");
const progressRoute = await import("@/app/api/progress/skills/route");

const EXPECTED = {
  A1: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15],
  A2: [16, 17, 18, 19, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 33, 34, 37, 40],
  B1: [41, 42, 44, 45, 48, 50, 51, 52, 55, 58, 59, 60, 62, 70],
  B2: [71, 73, 80, 82, 83, 84, 88, 90, 91, 94, 97, 99],
};

describe("Easy German videos file", () => {
  it("is valid: 57 topics, 70 videos, the listed topics per level", () => {
    const f = parseEasyGermanFile(file);
    expect(f.topics).toHaveLength(57);
    expect(f.topics.reduce((n, t) => n + t.videos.length, 0)).toBe(70);
    for (const [level, nums] of Object.entries(EXPECTED)) expect(f.topics.filter((t) => t.level === level).map((t) => t.topic)).toEqual(nums);
    expect(easyGermanTopicNumbers()).toHaveLength(57);
    const ids = f.topics.flatMap((t) => t.videos.map((v) => v.youtubeId));
    expect(new Set(ids).size).toBe(70);
  });

  it("matches the book topics and keeps channel names as they are", async () => {
    for (const t of parseEasyGermanFile(file).topics) expect((await getTopicByNumber(t.topic))!.title_de).toBe(t.title_de);
    expect(getEasyGermanVideos(1).map((v) => v.youtubeId)).toEqual(["r94aqLUO0wo", "Yaelm87PTvg", "RlGAbms-rqk"]);
    expect(getEasyGermanVideos(1)[2].channel).toBe("Easy Languages (the original Easy German channel)");
  });

  it("topics without a video get [] and a YouTube search link (no invented IDs)", () => {
    for (const n of [4, 12, 20, 100]) expect(getEasyGermanVideos(n)).toEqual([]);
    expect(easyGermanSearchUrl("Im Café")).toBe("https://www.youtube.com/results?search_query=Easy+German+Im+Caf%C3%A9");
    expect(easyGermanSearchUrl("Was wäre, wenn …?")).toBe("https://www.youtube.com/results?search_query=Easy+German+Was+w%C3%A4re%2C+wenn+%E2%80%A6%3F");
  });

  it("rejects broken files", () => {
    const base = structuredClone(file);
    const bad = (mut: (f: typeof base) => void) => {
      const f = structuredClone(base);
      mut(f);
      return () => parseEasyGermanFile(f);
    };
    expect(bad((f) => (f.topics[0].videos[0].youtubeId = "short"))).toThrow();
    expect(bad((f) => (f.topics[0].level = "B2"))).toThrow(/not B2/);
    expect(bad((f) => f.topics.push(structuredClone(f.topics[0])))).toThrow(/twice/);
    expect(bad((f) => (f.topics[0].videos[0].url = "https://www.youtube.com/watch?v=Yaelm87PTvg"))).toThrow(/doesn't match/);
    expect(bad((f) => (f.topics[0].videos = []))).toThrow();
  });

  it("reads the video ID from pasted YouTube links", () => {
    for (const s of [
      "https://www.youtube.com/watch?v=r94aqLUO0wo",
      "https://youtube.com/watch?v=r94aqLUO0wo&t=42s",
      "https://m.youtube.com/watch?v=r94aqLUO0wo",
      "https://youtu.be/r94aqLUO0wo?si=abc",
      "youtu.be/r94aqLUO0wo",
      "https://www.youtube.com/shorts/r94aqLUO0wo",
      "https://www.youtube-nocookie.com/embed/r94aqLUO0wo",
      "r94aqLUO0wo",
    ])
      expect(parseYouTubeId(s), s).toBe("r94aqLUO0wo");
    for (const s of ["", "https://www.youtube.com/watch?v=short", "https://vimeo.com/123456", "https://evil.com/watch?v=r94aqLUO0wo", "not a link"]) expect(parseYouTubeId(s), s).toBeNull();
  });
});

describe("Easy German videos: admin, API, progress, talk", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-eg-"));
  let n = 0;
  let admin: UserRow;
  let student: UserRow;
  const as = async (u: UserRow) => {
    cookie = await signToken({ u: u.id, v: (await getUser(u.id))!.tokenVersion, e: Date.now() + 60_000 });
  };
  const send = (method: string, url: string, body?: unknown) =>
    new Request(`http://test${url}`, { method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  beforeEach(async () => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `e${n++}.db`);
    cookie = undefined;
    admin = await signUp({ name: "Admin", username: "admin", password: "geheim123" }); // the first account is the admin
    student = await signUp({ name: "Sara", username: "sara", password: "geheim123" });
  });
  afterEach(() => vi.unstubAllGlobals());
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("admin additions/removals are merged with the file at runtime", async () => {
    await adminAddVideo(4, "abcdefghijk", "Neues Video");
    expect((await topicVideos(4)).map((v) => [v.youtubeId, v.added])).toEqual([["abcdefghijk", true]]);
    await adminRemoveVideo(1, "Yaelm87PTvg"); // a file video → hidden
    expect((await topicVideos(1)).map((v) => v.youtubeId)).toEqual(["r94aqLUO0wo", "RlGAbms-rqk"]);
    expect((await hiddenVideos(1)).map((v) => v.youtubeId)).toEqual(["Yaelm87PTvg"]);
    await adminAddVideo(1, "Yaelm87PTvg", ""); // restore
    expect(await topicVideos(1)).toHaveLength(3);
    await adminRemoveVideo(4, "abcdefghijk"); // an added video → gone
    expect(await topicVideos(4)).toEqual([]);
    expect(getEasyGermanVideos(1)).toHaveLength(3); // the JSON itself never changes
  });

  it("the admin API needs an admin, validates links and checks the video with YouTube", async () => {
    expect((await adminRoute.GET(send("GET", "/api/admin/topic-videos?topic=4"))).status).toBe(401);
    await as(student);
    expect((await adminRoute.POST(send("POST", "/x", { topic: 4, link: "https://youtu.be/abcdefghijk" }))).status).toBe(403);
    await as(admin);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ title: "Im Café | Easy German 1", author_name: "Easy German" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const bad = await adminRoute.POST(send("POST", "/x", { topic: 4, link: "https://youtube.com/watch?v=nope" }));
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: { code: string } }).error.code).toBe("invalid_link");
    const ok = (await (await adminRoute.POST(send("POST", "/x", { topic: 4, link: "https://youtu.be/abcdefghijk" }))).json()) as { videos: { title: string; channel: string }[] };
    expect(ok.videos).toEqual([expect.objectContaining({ title: "Im Café | Easy German 1", channel: "Easy German" })]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Not Found", { status: 404 })));
    const missing = await adminRoute.POST(send("POST", "/x", { topic: 4, link: "https://youtu.be/zzzzzzzzzzz" }));
    expect(((await missing.json()) as { error: { code: string } }).error.code).toBe("video_not_found");
    const del = (await (await adminRoute.DELETE(send("DELETE", "/x", { topic: 1, youtubeId: "RlGAbms-rqk" }))).json()) as { videos: unknown[]; hidden: unknown[] };
    expect([del.videos.length, del.hidden.length]).toEqual([2, 1]);
  });

  it("topic videos, card counts and the progress page per learner", async () => {
    expect((await topicRoute.GET(send("GET", "/"), { params: Promise.resolve({ n: "1" }) })).status).toBe(401);
    await as(student);
    const r = (await (await topicRoute.GET(send("GET", "/"), { params: Promise.resolve({ n: "1" }) })).json()) as { videos: unknown[] };
    expect(r.videos).toHaveLength(3);
    const none = (await (await topicRoute.GET(send("GET", "/"), { params: Promise.resolve({ n: "4" }) })).json()) as { videos: unknown[] };
    expect(none.videos).toEqual([]);
    expect((await topicRoute.GET(send("GET", "/"), { params: Promise.resolve({ n: "101" }) })).status).toBe(404);

    await saveVideoProgress(student.id, egKey("r94aqLUO0wo"), { watched: true });
    await saveVideoProgress(student.id, egKey("kwdnxwQCoXM"), { watched: true });
    await saveVideoProgress(admin.id, egKey("Yaelm87PTvg"), { watched: true }); // someone else's
    const lvl = (await (await levelRoute.GET(send("GET", "/"), { params: Promise.resolve({ level: "a1" }) })).json()) as { topics: { number: number; videos: { watched: number; total: number } }[] };
    const card = (n: number) => lvl.topics.find((t) => t.number === n)!.videos;
    expect(card(1)).toEqual({ watched: 1, total: 3 });
    expect(card(5)).toEqual({ watched: 1, total: 1 });
    expect(card(4)).toEqual({ watched: 0, total: 0 });

    const prog = (await (await progressRoute.GET()).json()) as { levels: { level: string; easyGerman: { watched: number; total: number } }[] };
    expect(prog.levels.map((l) => [l.level, l.easyGerman])).toEqual([
      ["A1", { watched: 2, total: 18 }],
      ["A2", { watched: 0, total: 22 }],
      ["B1", { watched: 0, total: 17 }],
      ["B2", { watched: 0, total: 13 }],
    ]);
  });

});
