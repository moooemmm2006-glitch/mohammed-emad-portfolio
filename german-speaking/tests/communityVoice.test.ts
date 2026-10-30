import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { resetDbForTests } from "@/lib/db";
import { SESSION_COOKIE, signToken } from "@/lib/auth/token";
import { getUser, signUp, type UserRow } from "@/lib/auth/users";
import { iceServers, VOICE_MAX } from "@/lib/community/voice";

// Voice call of a study room: 10 people at once, the offer/answer routing between all of them,
// the limit, mute, leaving, and who may take part.

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === SESSION_COOKIE && cookie ? { name, value: cookie } : undefined) }),
}));
const rooms = await import("@/app/api/community/rooms/route");
const room = await import("@/app/api/community/rooms/[id]/route");
const join = await import("@/app/api/community/rooms/[id]/join/route");
const leave = await import("@/app/api/community/rooms/[id]/leave/route");
const participants = await import("@/app/api/community/rooms/[id]/participants/route");
const live = await import("@/app/api/community/rooms/[id]/live/route");
const voice = await import("@/app/api/community/rooms/[id]/voice/route");

const json = (method: string, body?: unknown, url = "http://test/x") => new Request(url, { method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
type Peer = { sid: string; userId: string; muted: boolean; name: string };
type Poll = { peers: Peer[]; signals: { id: number; fromSid: string; kind: string; payload: string }[]; next: number };

describe("study room voice", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-voice-"));
  let n = 0;
  let users: UserRow[] = [];
  let roomId = "";
  let invite = "";
  const as = async (u: UserRow | null) => {
    cookie = u ? await signToken({ u: u.id, v: (await getUser(u.id))!.tokenVersion, e: Date.now() + 60_000 }) : undefined;
  };
  const ctx = () => ({ params: Promise.resolve({ id: roomId }) });
  const voicePost = async (u: UserRow, body: unknown) => {
    await as(u);
    return voice.POST(json("POST", body), ctx());
  };
  const poll = async (u: UserRow, sid: string, after = 0) => {
    await as(u);
    return voice.GET(json("GET", undefined, `http://test/x?sid=${sid}&after=${after}`), ctx());
  };

  beforeEach(async () => {
    resetDbForTests();
    process.env.DATABASE_PATH = path.join(dir, `v${n++}.db`);
    cookie = undefined;
    users = [];
    for (let i = 0; i < 12; i++) users.push(await signUp({ name: `User ${i}`, username: `user${i}`, password: "geheim123" }));
    await as(users[0]);
    const r = (await (await rooms.POST(json("POST", { name: "Lerngruppe", visibility: "private", capacity: 12, level: "A2", mode: "focus" }))).json()) as { id: string; inviteToken: string };
    roomId = r.id;
    invite = r.inviteToken;
    for (const u of users.slice(1, 11)) {
      await as(u);
      expect((await join.POST(json("POST", { inviteToken: invite }), ctx())).status).toBe(200);
    }
  });
  afterAll(() => {
    resetDbForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("only logged-in members of the room take part", async () => {
    await as(null);
    expect((await voice.POST(json("POST", { action: "join" }), ctx())).status).toBe(401);
    // user 11 has no invitation: the private room doesn't exist for them
    expect((await voicePost(users[11], { action: "join" })).status).toBe(404);
    expect((await poll(users[11], "whatever")).status).toBe(404);
  });

  it("10 people connect to each other: every offer and answer reaches exactly the right person", async () => {
    const ten = users.slice(0, VOICE_MAX);
    const sids = new Map<string, string>();
    for (const u of ten) {
      const r = (await (await voicePost(u, { action: "join" })).json()) as { sid: string; iceServers: unknown[] };
      expect(r.sid).toMatch(/^[\w-]{16}$/);
      expect(r.iceServers.length).toBeGreaterThan(0);
      sids.set(u.id, r.sid);
    }
    // the 11th in voice is refused (the room itself still has space)
    const full = await voicePost(users[10], { action: "join" });
    expect(full.status).toBe(409);
    expect(((await full.json()) as { error: { code: string } }).error.code).toBe("voice_full");

    // everyone sees all 10
    const first = (await (await poll(ten[3], sids.get(ten[3].id)!)).json()) as Poll;
    expect(first.peers.map((p) => p.sid).sort()).toEqual([...sids.values()].sort());

    // the smaller id calls the bigger one (like the browser does)
    for (const a of ten)
      for (const b of ten) {
        const sa = sids.get(a.id)!, sb = sids.get(b.id)!;
        if (sa < sb) expect((await voicePost(a, { action: "signal", sid: sa, to: sb, kind: "offer", payload: `offer ${sa}->${sb}` })).status).toBe(201);
      }
    // everyone reads their offers first …
    const cursors = new Map<string, number>();
    const inbox = new Map<string, Poll["signals"]>();
    for (const b of ten) {
      const sb = sids.get(b.id)!;
      const r = (await (await poll(b, sb)).json()) as Poll;
      cursors.set(b.id, r.next);
      inbox.set(b.id, r.signals);
      for (const s of r.signals) expect(s.payload).toBe(`offer ${s.fromSid}->${sb}`); // addressed to me, from who it says
      expect(r.signals.length).toBe([...sids.values()].filter((x) => x < sb).length);
    }
    // … then answers each one
    for (const b of ten) {
      const sb = sids.get(b.id)!;
      for (const s of inbox.get(b.id)!) expect((await voicePost(b, { action: "signal", sid: sb, to: s.fromSid, kind: "answer", payload: `answer ${sb}->${s.fromSid}` })).status).toBe(201);
    }
    let answers = 0;
    for (const a of ten) {
      const sa = sids.get(a.id)!;
      const r = (await (await poll(a, sa, cursors.get(a.id))).json()) as Poll;
      for (const s of r.signals) {
        expect(s.kind).toBe("answer");
        expect(s.payload).toBe(`answer ${s.fromSid}->${sa}`);
      }
      expect(r.signals.length).toBe([...sids.values()].filter((x) => x > sa).length);
      answers += r.signals.length;
    }
    expect(answers).toBe((VOICE_MAX * (VOICE_MAX - 1)) / 2); // 45 connections for 10 people
  });

  it("no one can send in someone else's name or to someone outside the call", async () => {
    const a = (await (await voicePost(users[1], { action: "join" })).json()) as { sid: string };
    const b = (await (await voicePost(users[2], { action: "join" })).json()) as { sid: string };
    // user 3 is in the room but not in voice, and tries to use user 1's id
    expect((await voicePost(users[3], { action: "signal", sid: a.sid, to: b.sid, kind: "offer", payload: "x" })).status).toBe(409);
    expect((await poll(users[3], a.sid)).status).toBe(409); // can't read user 1's inbox either
    expect((await voicePost(users[1], { action: "signal", sid: a.sid, to: "not-in-call", kind: "offer", payload: "x" })).status).toBe(404);
    expect((await voicePost(users[1], { action: "signal", sid: a.sid, to: b.sid, kind: "offer", payload: "x".repeat(40_000) })).status).toBe(400);
  });

  it("mute shows for everyone; leaving, being removed and the room ending take people out", async () => {
    const s = new Map<number, string>();
    for (const i of [0, 1, 2, 3]) s.set(i, ((await (await voicePost(users[i], { action: "join" })).json()) as { sid: string }).sid);
    expect((await voicePost(users[1], { action: "mute", sid: s.get(1), muted: true })).status).toBe(200);
    const view = (await (await poll(users[0], s.get(0)!)).json()) as Poll;
    expect(view.peers.find((p) => p.userId === users[1].id)?.muted).toBe(true);
    // the room snapshot shows who is in voice (🎙️/🔇 in the member list)
    await as(users[5]);
    const snap = (await (await live.GET(json("GET"), ctx())).json()) as { voice: { userId: string; muted: boolean }[] };
    expect(snap.voice).toHaveLength(4);

    expect((await voicePost(users[2], { action: "leave", sid: s.get(2) })).status).toBe(200);
    await as(users[0]);
    expect((await participants.POST(json("POST", { action: "remove", userId: users[3].id }), ctx())).status).toBe(200);
    let peers = ((await (await poll(users[0], s.get(0)!)).json()) as Poll).peers.map((p) => p.userId);
    expect(peers.sort()).toEqual([users[0].id, users[1].id].sort());
    expect((await poll(users[3], s.get(3)!)).status).toBe(404); // removed: no longer in the room

    // leaving the room leaves voice too
    await as(users[1]);
    expect((await leave.POST(json("POST"), ctx())).status).toBe(200);
    peers = ((await (await poll(users[0], s.get(0)!)).json()) as Poll).peers.map((p) => p.userId);
    expect(peers).toEqual([users[0].id]);

    // the host ends the room: nobody can poll voice any more
    await as(users[0]);
    expect((await room.PATCH(json("PATCH", { action: "end" }), ctx())).status).toBe(200);
    expect((await poll(users[0], s.get(0)!)).status).toBe(404);
  });

  it("a late heartbeat with the same id simply continues; a new join gets a new id", async () => {
    const a = ((await (await voicePost(users[1], { action: "join" })).json()) as { sid: string }).sid;
    expect((await poll(users[1], a)).status).toBe(200);
    const b = ((await (await voicePost(users[1], { action: "join" })).json()) as { sid: string }).sid;
    expect(b).not.toBe(a);
    expect((await poll(users[1], a)).status).toBe(409); // the old id is gone
    expect((await poll(users[1], b)).status).toBe(200);
  });

  it("STUN by default; a TURN relay only when fully configured", () => {
    expect(iceServers({})).toHaveLength(1);
    expect(iceServers({ TURN_URLS: "turn:relay.example.com:3478", TURN_USERNAME: "u" })).toHaveLength(1);
    const withTurn = iceServers({ TURN_URLS: "turn:relay.example.com:3478, turns:relay.example.com:443, http://bad", TURN_USERNAME: "u", TURN_CREDENTIAL: "p" });
    expect(withTurn[1]).toEqual({ urls: ["turn:relay.example.com:3478", "turns:relay.example.com:443"], username: "u", credential: "p" });
  });
});
