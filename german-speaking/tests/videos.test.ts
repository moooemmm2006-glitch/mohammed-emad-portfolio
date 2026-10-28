import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { nicosWeg, youtubeEmbedUrl, youtubePlaylistEmbedUrl } from "../data/videos";
import { getVideoThema, parseFeed, resetVideoThemaCache } from "@/lib/videoThema";
import { getVideoProgress, percentOf, saveVideoProgress } from "@/lib/videoProgress";
import { runPartnerTurn, type TurnEvent } from "@/lib/conversation";
import { resetDbForTests } from "@/lib/db";
import { createSession, getTurns } from "@/lib/db/repo";
import { MockLLM } from "@/lib/llm/mock";
import { buildPartnerSystemPrompt } from "@/lib/prompts";
import { videoQuestions } from "@/lib/videoTalk";

// A feed in the standard podcast RSS format (the live DW feed can't be reached from the test machine).
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>Video-Thema | Videos | DW Deutsch lernen</title>
  <item>
    <title>Older: Wohnungsnot in Gro&#223;st&#228;dten</title>
    <link>https://learngerman.dw.com/de/wohnungsnot/l-1</link>
    <guid isPermaLink="false">vt-1</guid>
    <pubDate>Mon, 05 Oct 2026 10:00:00 GMT</pubDate>
    <description><![CDATA[<p>In vielen St&auml;dten fehlen Wohnungen.</p>]]></description>
    <enclosure url="http://tvdownloaddw-a.akamaihd.net/video/vt1.mp4" length="1000" type="video/mp4"/>
  </item>
  <item>
    <title><![CDATA[Newest: Fahrrad statt Auto?]]></title>
    <link>https://learngerman.dw.com/de/fahrrad/l-2</link>
    <guid>vt-2</guid>
    <pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate>
    <description>Immer mehr Menschen fahren &quot;Rad&quot; &amp; lassen das Auto stehen.</description>
    <content:encoded><![CDATA[<p>Manuskript: Immer mehr Menschen in Deutschland fahren mit dem Fahrrad zur Arbeit.</p><p>Die Städte bauen neue Radwege, aber nicht alle sind zufrieden. Autofahrer beschweren sich über weniger Parkplätze.</p><script>alert(1)</script>]]></content:encoded>
    <enclosure url="https://tvdownloaddw-a.akamaihd.net/video/vt2.mp4" type="video/mp4" length="2000"/>
    <itunes:image href="https://static.dw.com/image/vt2.jpg"/>
    <itunes:duration>00:03:12</itunes:duration>
  </item>
  <item>
    <title>Audio only (skipped)</title>
    <guid>a-1</guid>
    <enclosure url="https://example.dw.com/a.mp3" type="audio/mpeg"/>
  </item>
  <item>
    <title>Bad link (skipped)</title>
    <guid>x-1</guid>
    <enclosure url="javascript:alert(1)" type="video/mp4"/>
  </item>
</channel>
</rss>`;

describe("video config", () => {
  it("has the official Nicos Weg movies and playlist in one place", () => {
    expect(nicosWeg.A1.movieId).toBe("4-eDoThe6qo");
    expect(nicosWeg.A2.movieId).toBe("Lg5P2w_Ro1c");
    expect(nicosWeg.B1.movieId).toBe("LkufozluseI");
    for (const l of ["A1", "A2", "B1"] as const) expect(nicosWeg[l].playlistId).toBe("PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg");
    expect(nicosWeg.A1.playlistStartIndex).toBe(1);
    // Unverified starts stay empty instead of guessed.
    expect(nicosWeg.A2.playlistStartIndex).toBeNull();
    expect(nicosWeg.B1.playlistStartIndex).toBeNull();
    expect(nicosWeg.B2.feedUrl).toBe("https://rss.dw.com/xml/DKpodcast_videothema_de");
  });

  it("embeds only through the privacy-enhanced YouTube player", () => {
    expect(youtubeEmbedUrl("4-eDoThe6qo", 125.7)).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/4-eDoThe6qo\?.*start=125/);
    expect(youtubePlaylistEmbedUrl(nicosWeg.A1.playlistId, 1)).toBe(
      "https://www.youtube-nocookie.com/embed/videoseries?list=PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg&index=1&rel=0&playsinline=1",
    );
  });
});

describe("Video-Thema feed", () => {
  it("parses video episodes, newest first, as plain text with safe https links", () => {
    const eps = parseFeed(FEED);
    expect(eps.map((e) => e.title)).toEqual(["Newest: Fahrrad statt Auto?", "Older: Wohnungsnot in Großstädten"]);
    const [n, o] = eps;
    expect(n.videoUrl).toBe("https://tvdownloaddw-a.akamaihd.net/video/vt2.mp4");
    expect(o.videoUrl.startsWith("https://")).toBe(true); // http upgraded
    expect(n.summary).toBe('Immer mehr Menschen fahren "Rad" & lassen das Auto stehen.');
    expect(n.text).toContain("Manuskript: Immer mehr Menschen");
    expect(n.text).not.toMatch(/<|alert/);
    expect(o.summary).toBe("In vielen Städten fehlen Wohnungen.");
    expect(n.link).toBe("https://learngerman.dw.com/de/fahrrad/l-2");
    expect(n.image).toBe("https://static.dw.com/image/vt2.jpg");
    expect(n.date).toBe("2026-10-19T10:00:00.000Z");
    expect(n.id).toMatch(/^[0-9a-f]{16}$/);
    expect(parseFeed(FEED)[0].id).toBe(n.id); // stable
  });

  it("serves the last good list when DW is unreachable, and a clear error without one", async () => {
    resetVideoThemaCache();
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await getVideoThema(down)).toMatchObject({ status: "error", episodes: [] });
    const ok = (async () => new Response(FEED, { status: 200 })) as unknown as typeof fetch;
    const live = await getVideoThema(ok);
    expect(live.status).toBe("live");
    expect(live.episodes).toHaveLength(2);
    const stale = await getVideoThema(down);
    expect(stale.status).toBe("stale");
    expect(stale.episodes).toHaveLength(2);
    const notFound = (async () => new Response("nope", { status: 404 })) as unknown as typeof fetch;
    expect((await getVideoThema(notFound)).status).toBe("stale");
  });
});

describe("watched progress and talking about the video", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-video-"));
  let n = 0;
  beforeEach(() => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `v${n++}.db`);
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("saves the position per user and marks the movie finished near the end", async () => {
    await saveVideoProgress("a", "nicos:A1:movie", { position: 600, duration: 6000 });
    let a = await getVideoProgress("a");
    expect(a[0]).toMatchObject({ position: 600, duration: 6000, watched: false });
    expect(percentOf(a[0])).toBe(10);
    expect(await getVideoProgress("b")).toEqual([]);
    await saveVideoProgress("a", "nicos:A1:movie", { position: 5900, duration: 6000 });
    a = await getVideoProgress("a");
    expect(a[0].watched).toBe(true);
    expect(percentOf(a[0])).toBe(100);
    // Watching again from the start keeps it finished; the button can undo it.
    await saveVideoProgress("a", "nicos:A1:movie", { position: 30 });
    expect((await getVideoProgress("a"))[0].watched).toBe(true);
    await saveVideoProgress("a", "nicos:A1:movie", { watched: false });
    expect((await getVideoProgress("a"))[0].watched).toBe(false);
  });

  const run = async (sessionId: string, text?: string) => {
    const ev: TurnEvent[] = [];
    await runPartnerTurn({ sessionId, userText: text, emit: (e) => ev.push(e), llm: new MockLLM() });
    const done = ev.find((e) => e.type === "done");
    return done && done.type === "done" ? done.text : "";
  };

  it("without an API key the partner asks simple questions about Nicos Weg, once each, then closes", async () => {
    const s = await createSession("A1", null, null, "u1", null, JSON.stringify({ kind: "nicos", level: "A1" }));
    const qs = videoQuestions("A1");
    expect(qs.slice(0, 4)).toEqual(["Wer ist Nico?", "Woher kommt Nico?", "Was ist passiert?", "Was macht Nico jetzt?"]);
    const hello = await run(s.id);
    expect(hello).toContain("Nicos Weg");
    expect(hello).toContain("Wer ist Nico?");
    const replies: string[] = [];
    for (let i = 0; i < qs.length; i++) replies.push(await run(s.id, "Nico kommt aus Spanien."));
    qs.slice(1).forEach((q, i) => expect(replies[i]).toContain(q));
    expect(replies.at(-1)).toContain("Video");
    expect(await run(s.id, "Tschüss")).toContain("Video gesprochen");
    expect((await getTurns(s.id)).filter((t) => t.role === "user")).toHaveLength(qs.length + 1);
  });

  it("with an API key the partner gets the video, without invented plot details", () => {
    const nicos = buildPartnerSystemPrompt({ level: "A2", correctionMode: "recast", video: { kind: "nicos", level: "A2" } });
    expect(nicos).toContain("Nicos Weg");
    expect(nicos).toContain("never invent plot details");
    const vt = buildPartnerSystemPrompt({
      level: "B2",
      correctionMode: "recast",
      video: { kind: "videothema", id: "0123456789abcdef", title: "Fahrrad statt Auto?", summary: "Immer mehr Menschen fahren Rad." },
    });
    expect(vt).toContain("Fahrrad statt Auto?");
    expect(vt).toContain("Immer mehr Menschen fahren Rad.");
  });
});
