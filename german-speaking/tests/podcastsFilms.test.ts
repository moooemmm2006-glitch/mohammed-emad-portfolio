import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { podcasts as podcastFile } from "../data/podcasts";
import { films as filmFile } from "../data/films";
import { resetDbForTests } from "@/lib/db";
import { listPodcasts } from "@/lib/podcasts";
import { listFilms, removeFilm } from "@/lib/films";
import { parseYouTubeSource, podcastProgressKey } from "@/lib/podcastShared";
import { filmProgressKey } from "@/lib/filmsShared";
import { levelListeningProgress } from "@/lib/skills";
import { saveVideoProgress, VIDEO_KEY } from "@/lib/videoProgress";
import { parseFeed, resetVideoThemaCache } from "@/lib/videoThema";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { getUser, signUp, type UserRow } from "@/lib/auth/users";

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));
vi.mock("@/lib/site", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/site")>()),
  youtubeOEmbed: vi.fn(),
}));

const podcastAdmin = await import("@/app/api/admin/podcasts/route");
const filmAdmin = await import("@/app/api/admin/films/route");
const { youtubeOEmbed } = await import("@/lib/site");

describe("podcasts, film recommendations, and listening progress", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-listening-extra-"));
  let n = 0;
  let admin: UserRow;
  let student: UserRow;
  const as = async (user: UserRow) => {
    cookie = await signToken({ u: user.id, v: (await getUser(user.id))!.tokenVersion, e: Date.now() + 60_000 });
  };
  const send = (method: string, url: string, body?: unknown) => new Request(`http://test${url}`, { method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

  beforeEach(async () => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `listening-${n++}.db`);
    cookie = undefined;
    vi.mocked(youtubeOEmbed).mockReset();
    admin = await signUp({ name: "Admin", username: `admin${n}`, password: "geheim123" });
    student = await signUp({ name: "Sara", username: `sara${n}`, password: "geheim123" });
  });
  afterEach(() => { vi.unstubAllGlobals(); resetVideoThemaCache(); });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("keeps the supplied verified episodes and accepts only video/playlist YouTube sources", () => {
    expect(podcastFile.map((p) => p.youtubeId)).toEqual(["kaSAeFMlYpA", "2M7n_vavkJc"]);
    expect(podcastFile.every((p) => p.levels.join() === "B1,B2" && p.channel === "DKW Akademie")).toBe(true);
    expect(parseYouTubeSource("https://www.youtube.com/watch?v=2M7n_vavkJc&t=12")).toEqual({ youtubeId: "2M7n_vavkJc" });
    expect(parseYouTubeSource("https://www.youtube.com/playlist?list=PL1234567890")).toEqual({ playlistId: "PL1234567890" });
    expect(parseYouTubeSource("https://evil.example/watch?v=2M7n_vavkJc")).toBeNull();
    expect(parseYouTubeSource("https://youtube.com/watch?v=bad")).toBeNull();
  });

  it("protects podcast admin, validates the channel, persists additions, merges the file, and removes only dynamic items", async () => {
    expect((await podcastAdmin.GET()).status).toBe(401);
    await as(student);
    expect((await podcastAdmin.POST(send("POST", "/", { link: "https://youtu.be/abcdefghijk", levels: ["B1"] }))).status).toBe(403);
    await as(admin);
    expect((await podcastAdmin.POST(send("POST", "/", { link: "https://youtu.be/nope", levels: ["B1"] }))).status).toBe(400);
    vi.mocked(youtubeOEmbed).mockResolvedValue({ title: "Neues Gespräch", author: "DKW Akademie", authorUrl: "https://www.youtube.com/channel/UCVU6C-LO-qDNHYLX0-2Sfdw" });
    const added = await podcastAdmin.POST(send("POST", "/", { link: "https://youtu.be/abcdefghijk", levels: ["B2"] }));
    expect(added.status).toBe(200);
    expect((await listPodcasts("B2"))[0]).toMatchObject({ youtubeId: "abcdefghijk", title: "Neues Gespräch", levels: ["B2"], added: true });
    expect((await listPodcasts("B1")).some((p) => p.youtubeId === "abcdefghijk")).toBe(false);
    expect((await listPodcasts()).slice(-2).map((p) => p.youtubeId)).toEqual(["kaSAeFMlYpA", "2M7n_vavkJc"]);
    vi.mocked(youtubeOEmbed).mockResolvedValue({ title: "Wrong channel", author: "Other", authorUrl: "https://www.youtube.com/@someoneelse" });
    const wrong = await podcastAdmin.POST(send("POST", "/", { link: "https://youtu.be/abcdefghijk", levels: ["B1"] }));
    expect(wrong.status).toBe(400);
    expect(((await wrong.json()) as { error: { code: string } }).error.code).toBe("wrong_channel");
    const removed = await podcastAdmin.DELETE(send("DELETE", "/", { id: "video:abcdefghijk" }));
    expect(removed.status).toBe(200);
    expect((await listPodcasts()).some((p) => p.youtubeId === "abcdefghijk")).toBe(false);
    expect(podcastFile).toHaveLength(2);
  });

  it("supports playlist resources and shares the same per-user progress storage", async () => {
    expect(VIDEO_KEY.test("pod:kaSAeFMlYpA")).toBe(true);
    expect(VIDEO_KEY.test("podlist:PL1234567890")).toBe(true);
    expect(VIDEO_KEY.test("film:good-bye-lenin")).toBe(true);
    expect(podcastProgressKey({ playlistId: "PL1234567890" })).toBe("podlist:PL1234567890");
    expect(filmProgressKey("good-bye-lenin")).toBe("film:good-bye-lenin");
    await saveVideoProgress("learner", "pod:kaSAeFMlYpA", { watched: true });
    await saveVideoProgress("learner", "film:good-bye-lenin", { watched: true });
    await saveVideoProgress("someone-else", "pod:kaSAeFMlYpA", { watched: true });
    const b1 = await levelListeningProgress("learner", "B1");
    expect(b1).toEqual({ watched: 1, total: 20 }); // Nicos Weg + Easy German + the two file episodes
    expect(await levelListeningProgress("other", "A1")).toEqual({ watched: 0, total: 1 });
  });

  it("includes watched Video-Thema episodes, DKW episodes, and films in B2 Hören progress", async () => {
    const feedXml = `<rss><channel><item><title>Fahrrad statt Auto?</title><link>https://learngerman.dw.com/de/fahrrad</link><guid>progress-vt</guid><enclosure url="https://media.dw.com/progress.mp4" type="video/mp4"/></item></channel></rss>`;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(feedXml, { status: 200 })));
    const episode = parseFeed(feedXml)[0];
    await saveVideoProgress("learner", `vt:${episode.id}`, { watched: true });
    await saveVideoProgress("learner", "pod:kaSAeFMlYpA", { watched: true });
    await saveVideoProgress("learner", "film:good-bye-lenin", { watched: true });
    expect(await levelListeningProgress("learner", "B2")).toEqual({ watched: 3, total: 20 });
  });

  it("seeds four designed film cards, adds admin cards, and hides static cards without changing the file", async () => {
    expect(filmFile.map((f) => f.id)).toEqual(["typisch-episode-1", "almanya-willkommen-in-deutschland", "good-bye-lenin", "fack-ju-gohte"]);
    expect((await filmAdmin.GET()).status).toBe(401);
    await as(admin);
    const added = await filmAdmin.POST(send("POST", "/", { title: "Testfilm", year: 2020, summary: "Ein ruhiger Film für die Übung.", genre: "Drama", usefulness: "Alltagssprache" }));
    expect(added.status).toBe(200);
    const catalog = await listFilms();
    expect(catalog).toHaveLength(5);
    expect(catalog.at(-1)).toMatchObject({ title: "Testfilm", year: 2020, added: true });
    expect(await removeFilm("fack-ju-gohte")).toBe(true);
    expect((await listFilms()).some((f) => f.id === "fack-ju-gohte")).toBe(false);
    expect(filmFile).toHaveLength(4);
    const del = await filmAdmin.DELETE(send("DELETE", "/", { id: catalog.at(-1)!.id }));
    expect(del.status).toBe(200);
    expect(await listFilms()).toHaveLength(3);
  });
});
