"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { fill } from "@/lib/client/i18n";
import { useMe } from "@/lib/client/me";
import { useUI } from "@/lib/client/ui";
import { VoiceSession, type VoiceStart, type VoiceView } from "@/lib/client/voice";

/** 🎙️ The room's voice call: audio only, up to `max` people. `inVoice` = who is in it (from the room snapshot). */
export function VoicePanel({ roomId, inVoice, max = 10 }: { roomId: string; inVoice: number; max?: number }) {
  const { t } = useUI();
  const { me } = useMe();
  const [view, setView] = useState<VoiceView | null>(null);
  const [state, setState] = useState<"idle" | "starting" | "on" | Exclude<VoiceStart, "on"> | "removed">("idle");
  const session = useRef<VoiceSession | null>(null);

  useEffect(() => () => void session.current?.stop(), []);

  const join = async () => {
    setState("starting");
    const s = new VoiceSession(roomId, setView, (why) => {
      session.current = null;
      setView(null);
      setState(why === "removed" ? "removed" : "idle");
    });
    const r = await s.start();
    if (r === "on") {
      session.current = s;
      setState("on");
    } else setState(r);
  };
  const leave = () => void session.current?.stop();
  const on = state === "on" && view;
  const myName = me?.user.name || me?.user.username || t("community_voice_you");

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="voice-title" data-testid="voice-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="voice-title" className="font-bold text-lg">
            {t("community_voice_title")}
          </h2>
          <p className="text-sm text-muted mt-0.5">{fill(t("community_voice_sub"), { n: max })}</p>
        </div>
        {on ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`btn ${view.muted ? "btn-primary" : "btn-ghost"}`} aria-pressed={view.muted} onClick={() => session.current?.setMuted(!view.muted)}>
              {view.muted ? t("community_voice_unmute") : t("community_voice_mute")}
            </button>
            <button type="button" className="btn btn-ghost text-danger" onClick={leave}>
              {t("community_voice_leave")}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary" disabled={state === "starting"} onClick={() => void join()}>
            {state === "starting" ? t("loading") : t("community_voice_join")}
          </button>
        )}
      </div>

      {!on && (
        <p className="text-sm mt-3" role={state === "idle" || state === "starting" ? undefined : "alert"}>
          {state === "denied"
            ? t("community_voice_denied")
            : state === "full"
              ? fill(t("community_voice_full"), { n: max })
              : state === "unsupported"
                ? t("community_voice_unsupported")
                : state === "error"
                  ? t("community_voice_error")
                  : state === "removed"
                    ? t("community_voice_removed")
                    : inVoice
                      ? fill(t("community_voice_count"), { n: inVoice })
                      : t("community_voice_empty")}
        </p>
      )}

      {on && (
        <>
          {view.needsTap && (
            <button type="button" className="btn btn-primary w-full mt-3" onClick={() => session.current?.resumeAudio()}>
              {t("community_voice_tap")}
            </button>
          )}
          <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-live="polite">
            <VoiceTile name={myName} photo={me?.user.photo ?? null} muted={view.muted} speaking={view.speaking} you={t("community_voice_you")} />
            {view.peers.map((p) => (
              <VoiceTile
                key={p.sid}
                name={p.name}
                photo={p.photo}
                muted={p.muted}
                speaking={p.speaking}
                status={p.connection === "connected" ? undefined : p.connection === "failed" ? t("community_voice_failed") : t("community_voice_connecting")}
                connected={p.connection === "connected"}
              />
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">{t("community_voice_headphones")}</p>
        </>
      )}
    </section>
  );
}

function VoiceTile({ name, photo, muted, speaking, you, status, connected }: { name: string; photo: string | null; muted: boolean; speaking: boolean; you?: string; status?: string; connected?: boolean }) {
  return (
    <li className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface-2/70 p-3 text-center" data-voice-tile data-speaking={speaking ? "1" : "0"} data-connected={you ? "me" : connected ? "1" : "0"}>
      <span className={`relative rounded-full p-0.5 transition-shadow ${speaking ? "ring-4 ring-emerald-500/70 shadow-[0_0_18px_rgba(16,185,129,0.55)]" : "ring-2 ring-transparent"}`}>
        {photo ? (
          <Image src={photo} alt="" width={56} height={56} unoptimized className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <span className="w-14 h-14 rounded-full bg-emerald-600/20 text-emerald-800 dark:text-emerald-200 grid place-items-center text-xl font-bold">{name.trim().slice(0, 1) || "?"}</span>
        )}
        {muted && (
          <span className="absolute -bottom-1 -end-1 grid place-items-center w-6 h-6 rounded-full bg-danger text-white text-xs" aria-hidden="true">
            🔇
          </span>
        )}
      </span>
      <span className="text-sm font-semibold truncate max-w-full" dir="auto">
        {name}
        {you && <span className="text-muted font-normal"> · {you}</span>}
      </span>
      {status && <span className="text-[11px] text-muted">{status}</span>}
    </li>
  );
}
