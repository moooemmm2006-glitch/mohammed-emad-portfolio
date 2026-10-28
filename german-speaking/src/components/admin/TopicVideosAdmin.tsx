"use client";

import { useState } from "react";
import { ApiError, api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { parseYouTubeId, type EasyGermanVideo } from "@/lib/easyGermanShared";
import { youtubeThumb } from "../../../data/videos";

interface State {
  topic: number;
  videos: EasyGermanVideo[];
  hidden: EasyGermanVideo[];
}

/** Admin: add/remove a topic's Easy German videos by pasting a YouTube link (saved in the database). */
export function TopicVideosAdmin() {
  const { t } = useUI();
  const [topic, setTopic] = useState("1");
  const [data, setData] = useState<State | null>(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (p: Promise<State>) => {
    setBusy(true);
    setMsg(null);
    try {
      setData(await p);
      return true;
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      setMsg(code === "invalid_link" ? t("adm_vid_invalid") : code === "video_not_found" ? t("adm_vid_not_found") : t("adm_vid_error"));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const n = Number(topic);
  const load = () => void run(api<State>(`/api/admin/topic-videos?topic=${n}`));
  const add = async () => {
    if (!parseYouTubeId(link)) return setMsg(t("adm_vid_invalid"));
    if (await run(api<State>("/api/admin/topic-videos", { method: "POST", body: JSON.stringify({ topic: data?.topic ?? n, link, title: title || undefined }) }))) {
      setLink("");
      setTitle("");
    }
  };
  const remove = (youtubeId: string) => void run(api<State>("/api/admin/topic-videos", { method: "DELETE", body: JSON.stringify({ topic: data!.topic, youtubeId }) }));
  const restore = (youtubeId: string) => void run(api<State>("/api/admin/topic-videos", { method: "POST", body: JSON.stringify({ topic: data!.topic, link: youtubeId }) }));

  return (
    <section className="card p-5 space-y-4" aria-label={t("adm_vid_title")}>
      <div>
        <h2 className="text-lg font-bold">🎧 {t("adm_vid_title")}</h2>
        <p className="text-sm text-muted">{t("adm_vid_sub")}</p>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <label className="text-sm">
          <span className="block mb-1 text-muted">{t("adm_vid_topic")}</span>
          <input type="number" min={1} max={100} value={topic} onChange={(e) => setTopic(e.target.value)} className="w-28 rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px] tabular-nums" />
        </label>
        <button className="btn btn-ghost !min-h-[44px]" disabled={busy || !(n >= 1 && n <= 100)}>
          {t("adm_vid_load")}
        </button>
      </form>

      {data && (
        <div className="space-y-3">
          <p className="font-semibold tabular-nums">#{data.topic}</p>
          {data.videos.length === 0 && <p className="text-sm text-muted">{t("adm_vid_none")}</p>}
          <ul className="space-y-2">
            {data.videos.map((v) => (
              <li key={v.youtubeId} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
                <img src={youtubeThumb(v.youtubeId)} alt="" loading="lazy" className="w-20 aspect-video rounded-lg object-cover shrink-0" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold truncate" dir="ltr">
                    {v.title}
                  </span>
                  <span className="text-xs text-muted" dir="ltr">
                    {v.youtubeId} · {v.channel}
                  </span>
                  {v.added && <span className="chip !min-h-0 !py-0 text-xs ms-2">{t("adm_vid_added_tag")}</span>}
                </span>
                <button type="button" className="btn btn-ghost !min-h-[38px] text-danger" onClick={() => remove(v.youtubeId)} disabled={busy}>
                  {t("adm_vid_remove")}
                </button>
              </li>
            ))}
          </ul>
          {data.hidden.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted">{t("adm_vid_hidden")}</p>
              {data.hidden.map((v) => (
                <p key={v.youtubeId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate line-through text-muted" dir="ltr">
                    {v.title}
                  </span>
                  <button type="button" className="chip !min-h-[34px] text-xs" onClick={() => restore(v.youtubeId)} disabled={busy}>
                    {t("adm_vid_restore")}
                  </button>
                </p>
              ))}
            </div>
          )}
          <form
            className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <input dir="ltr" placeholder={t("adm_vid_link")} aria-label={t("adm_vid_link")} value={link} onChange={(e) => setLink(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" />
            <input dir="auto" placeholder={t("adm_vid_title_opt")} aria-label={t("adm_vid_title_opt")} value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" />
            <button className="btn btn-primary !min-h-[44px]" disabled={busy || !link.trim()}>
              {t("adm_vid_add")}
            </button>
          </form>
        </div>
      )}
      {msg && (
        <p role="alert" className="text-sm text-danger">
          {msg}
        </p>
      )}
    </section>
  );
}
