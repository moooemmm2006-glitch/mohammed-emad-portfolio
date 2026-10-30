"use client";

import { api, ApiError } from "./api";

// Voice call of a study room, in the browser: microphone only (never the camera), one direct
// WebRTC connection to every other participant (mesh, up to 10 people). The site's server only
// passes the connection offers/answers along (polled), the audio goes browser to browser.

export interface VoicePeerInfo {
  sid: string;
  userId: string;
  name: string;
  photo: string | null;
  muted: boolean;
}
export interface VoicePeerView extends VoicePeerInfo {
  /** "new" | "connecting" | "connected" | "failed" … */
  connection: string;
  speaking: boolean;
}
export interface VoiceView {
  sid: string;
  muted: boolean;
  speaking: boolean;
  peers: VoicePeerView[];
  /** The browser blocked playing sound until the next tap. */
  needsTap: boolean;
}
export type VoiceStart = "on" | "denied" | "full" | "unsupported" | "error";
export type VoiceEnd = "removed" | "left";

interface Signal {
  id: number;
  fromSid: string;
  kind: "offer" | "answer";
  payload: string;
}
interface Conn {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement | null;
  analyser: AnalyserNode | null;
  offeredAt: number;
  retries: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** A slow phone may need a while to answer; only then call again. */
const OFFER_TIMEOUT_MS = 20_000;

/** Wait until all local network candidates are in the description (or 2 s), so one message per side is enough. */
function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => pc.iceGatheringState === "complete" && done();
    const timer = setTimeout(done, 2000);
    pc.addEventListener("icegatheringstatechange", check);
  });
}

function level(analyser: AnalyserNode | null, buf: Uint8Array<ArrayBuffer>): number {
  if (!analyser) return 0;
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += ((v - 128) / 128) ** 2;
  return Math.sqrt(sum / buf.length);
}

export class VoiceSession {
  sid = "";
  private stream: MediaStream | null = null;
  private ice: RTCIceServer[] = [];
  private conns = new Map<string, Conn>();
  private peers: VoicePeerInfo[] = [];
  private after = 0;
  private stopped = false;
  private muted = false;
  private needsTap = false;
  private ctx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private speaking = new Map<string, boolean>();
  /** After a failed connection: when to call again, and how many tries so far. */
  private retryAt = new Map<string, { at: number; tries: number }>();
  private meter: ReturnType<typeof setInterval> | null = null;
  private buf = new Uint8Array(512);

  constructor(
    private roomId: string,
    private onView: (v: VoiceView) => void,
    private onEnd: (why: VoiceEnd) => void,
  ) {}

  private get url() {
    return `/api/community/rooms/${this.roomId}/voice`;
  }

  async start(): Promise<VoiceStart> {
    if (typeof RTCPeerConnection === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    } catch {
      return "denied";
    }
    try {
      const r = await api<{ sid: string; iceServers: RTCIceServer[] }>(this.url, { method: "POST", body: JSON.stringify({ action: "join" }) });
      this.sid = r.sid;
      this.ice = r.iceServers;
    } catch (e) {
      this.stopTracks();
      return e instanceof ApiError && e.code === "voice_full" ? "full" : "error";
    }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = AC ? new AC() : null;
      if (this.ctx) {
        this.localAnalyser = this.ctx.createAnalyser();
        this.localAnalyser.fftSize = 512;
        this.ctx.createMediaStreamSource(this.stream).connect(this.localAnalyser);
      }
    } catch {
      this.ctx = null;
    }
    this.meter = setInterval(() => this.measure(), 250);
    window.addEventListener("pagehide", this.beacon);
    void this.loop();
    this.emit();
    return "on";
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    for (const t of this.stream?.getAudioTracks() ?? []) t.enabled = !muted;
    void api(this.url, { method: "POST", body: JSON.stringify({ action: "mute", sid: this.sid, muted }) }).catch(() => {});
    this.emit();
  }

  /** After a blocked autoplay: called from a tap. */
  resumeAudio() {
    void this.ctx?.resume();
    for (const c of this.conns.values()) void c.audio?.play().catch(() => {});
    this.needsTap = false;
    this.emit();
  }

  async stop(why: VoiceEnd = "left") {
    if (this.stopped) return;
    this.stopped = true;
    window.removeEventListener("pagehide", this.beacon);
    if (this.meter) clearInterval(this.meter);
    for (const sid of [...this.conns.keys()]) this.close(sid);
    this.stopTracks();
    void this.ctx?.close().catch(() => {});
    if (why === "left" && this.sid) await api(this.url, { method: "POST", body: JSON.stringify({ action: "leave", sid: this.sid }) }).catch(() => {});
    this.onEnd(why);
  }

  private beacon = () => {
    if (this.sid) navigator.sendBeacon?.(this.url, new Blob([JSON.stringify({ action: "leave", sid: this.sid })], { type: "text/plain" }));
  };

  private stopTracks() {
    for (const t of this.stream?.getTracks() ?? []) t.stop();
  }

  private async loop() {
    while (!this.stopped) {
      await this.poll();
      // Poll faster only while a connection is being set up right now.
      const settling = [...this.conns.values()].some((c) => c.pc.connectionState === "new" || c.pc.connectionState === "connecting");
      await sleep(settling ? 1000 : 2000);
    }
  }

  private async poll() {
    try {
      const r = await api<{ peers: VoicePeerInfo[]; signals: Signal[]; next: number }>(`${this.url}?sid=${encodeURIComponent(this.sid)}&after=${this.after}`);
      if (this.stopped) return;
      this.after = r.next;
      // In parallel: an answer waits for the network candidates, which must not hold up the heartbeat.
      for (const s of r.signals) void this.onSignal(s).catch(() => {});
      this.sync(r.peers);
    } catch (e) {
      if (this.stopped || !(e instanceof ApiError)) return; // offline for a moment: keep trying
      if (e.code === "not_in_voice") {
        // We timed out (e.g. the tab slept): join again with a new id.
        try {
          const r = await api<{ sid: string; iceServers: RTCIceServer[] }>(this.url, { method: "POST", body: JSON.stringify({ action: "join" }) });
          for (const sid of [...this.conns.keys()]) this.close(sid);
          this.sid = r.sid;
          this.after = 0;
          if (this.muted) this.setMuted(true);
        } catch {
          void this.stop("removed");
        }
      } else if (e.status === 404 || e.status === 401) void this.stop("removed");
    }
  }

  private sync(list: VoicePeerInfo[]) {
    const others = list.filter((p) => p.sid !== this.sid);
    this.peers = others;
    const now = Date.now();
    for (const p of others) {
      const c = this.conns.get(p.sid);
      // The participant with the smaller id calls; the other one answers (no crossed calls).
      if (!c) {
        const r = this.retryAt.get(p.sid);
        if (this.sid < p.sid && (!r || r.at <= now)) void this.call(p.sid, r?.tries ?? 0);
      } else if (this.sid < p.sid && c.pc.connectionState !== "connected" && !c.pc.remoteDescription && now - c.offeredAt > OFFER_TIMEOUT_MS) {
        this.close(p.sid);
        void this.call(p.sid);
      }
    }
    for (const sid of [...this.conns.keys()]) if (!others.some((p) => p.sid === sid)) this.close(sid);
    for (const sid of [...this.retryAt.keys()]) if (!others.some((p) => p.sid === sid)) this.retryAt.delete(sid);
    this.emit();
  }

  private create(sid: string): Conn {
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    for (const t of this.stream?.getAudioTracks() ?? []) pc.addTrack(t, this.stream!);
    const conn: Conn = { pc, audio: null, analyser: null, offeredAt: Date.now(), retries: 0 };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      if (!conn.audio) {
        const el = document.createElement("audio");
        el.autoplay = true;
        el.setAttribute("playsinline", "");
        el.dataset.voicePeer = sid;
        el.style.display = "none";
        document.body.appendChild(el);
        conn.audio = el;
      }
      conn.audio.srcObject = stream;
      conn.audio.play().catch((e: unknown) => {
        // Only a real autoplay block needs a tap (not a play() interrupted by a new stream).
        if (e instanceof DOMException && e.name === "NotAllowedError") {
          this.needsTap = true;
          this.emit();
        }
      });
      if (this.ctx) {
        try {
          conn.analyser = this.ctx.createAnalyser();
          conn.analyser.fftSize = 512;
          this.ctx.createMediaStreamSource(stream).connect(conn.analyser);
        } catch {
          conn.analyser = null;
        }
      }
      this.emit();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" && this.sid < sid) {
        // Try again with a fresh connection, waiting a bit longer each time (at most 20 s).
        const tries = conn.retries + 1;
        this.close(sid);
        this.retryAt.set(sid, { at: Date.now() + Math.min(20_000, 1500 * tries), tries });
      } else if (pc.connectionState === "connected") this.retryAt.delete(sid);
      this.emit();
    };
    this.conns.set(sid, conn);
    return conn;
  }

  private async call(sid: string, retries = 0) {
    const conn = this.create(sid);
    conn.retries = retries;
    const offer = await conn.pc.createOffer();
    await conn.pc.setLocalDescription(offer);
    await gathered(conn.pc);
    if (this.conns.get(sid) !== conn || !conn.pc.localDescription) return;
    conn.offeredAt = Date.now();
    await this.send(sid, "offer", conn.pc.localDescription.sdp);
  }

  private async onSignal(s: Signal) {
    if (s.kind === "offer") {
      // A new offer always starts a fresh connection (the caller restarted).
      if (this.conns.has(s.fromSid)) this.close(s.fromSid);
      const conn = this.create(s.fromSid);
      await conn.pc.setRemoteDescription({ type: "offer", sdp: s.payload });
      const answer = await conn.pc.createAnswer();
      await conn.pc.setLocalDescription(answer);
      await gathered(conn.pc);
      if (this.conns.get(s.fromSid) !== conn || !conn.pc.localDescription) return;
      await this.send(s.fromSid, "answer", conn.pc.localDescription.sdp);
    } else {
      const conn = this.conns.get(s.fromSid);
      if (conn && conn.pc.signalingState === "have-local-offer") await conn.pc.setRemoteDescription({ type: "answer", sdp: s.payload });
    }
  }

  private async send(to: string, kind: "offer" | "answer", payload: string) {
    await api(this.url, { method: "POST", body: JSON.stringify({ action: "signal", sid: this.sid, to, kind, payload }) }).catch(() => {});
  }

  private close(sid: string) {
    const c = this.conns.get(sid);
    if (!c) return;
    this.conns.delete(sid);
    c.pc.ontrack = null;
    c.pc.onconnectionstatechange = null;
    c.pc.close();
    if (c.audio) {
      c.audio.srcObject = null;
      c.audio.remove();
    }
    this.speaking.delete(sid);
  }

  private measure() {
    let changed = false;
    const set = (key: string, on: boolean) => {
      if (this.speaking.get(key) !== on) {
        this.speaking.set(key, on);
        changed = true;
      }
    };
    set("me", !this.muted && level(this.localAnalyser, this.buf) > 0.03);
    for (const [sid, c] of this.conns) set(sid, level(c.analyser, this.buf) > 0.03);
    if (changed) this.emit();
  }

  private emit() {
    if (this.stopped) return;
    this.onView({
      sid: this.sid,
      muted: this.muted,
      speaking: Boolean(this.speaking.get("me")),
      needsTap: this.needsTap,
      peers: this.peers.map((p) => ({ ...p, connection: this.conns.get(p.sid)?.pc.connectionState ?? "new", speaking: Boolean(this.speaking.get(p.sid)) })),
    });
  }
}
