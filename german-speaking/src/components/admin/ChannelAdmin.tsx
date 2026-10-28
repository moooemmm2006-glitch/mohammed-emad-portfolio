"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/client/api";
import { fill, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { CLICK_PLACES, parseChannelUrl, parsePlaylistId, parseYouTubeId, type ClickPlace, type SiteLinks, type Vlog } from "@/lib/siteShared";
import { youtubeThumb } from "../../../data/videos";
import { IconVideoPlay } from "../Icons";

type Clicks = { total: number; byPlace: Record<ClickPlace, number> };
type Field = "channelUrl" | "explainer" | "playlist";

const ERR: Record<string, TKey> = {
  invalid_channel: "adm_yt_invalid_channel",
  invalid_video: "adm_yt_invalid_video",
  invalid_playlist: "adm_yt_invalid_playlist",
  invalid_photo: "adm_yt_invalid_photo",
  not_my_channel: "adm_vlog_not_mine",
  video_not_found: "adm_vlog_not_found",
};
const errText = (e: unknown, t: (k: TKey) => string) => t(ERR[e instanceof ApiError ? e.code : ""] ?? "adm_vid_error");

/** Admin: "قناتي على يوتيوب" (channel, explainer video, tutorials playlist, photo, clicks). */
export function ChannelAdmin() {
  const { t } = useUI();
  const [links, setLinks] = useState<SiteLinks | null>(null);
  const [clicks, setClicks] = useState<Clicks | null>(null);
  const [draft, setDraft] = useState<Record<Field, string>>({ channelUrl: "", explainer: "", playlist: "" });
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const apply = (d: { links: SiteLinks; clicks: Clicks }) => {
    setLinks(d.links);
    setClicks(d.clicks);
    setDraft({
      channelUrl: d.links.channelUrl ?? "",
      explainer: d.links.explainerId ? `https://youtu.be/${d.links.explainerId}` : "",
      playlist: d.links.playlistId ? `https://www.youtube.com/playlist?list=${d.links.playlistId}` : "",
    });
  };
  useEffect(() => {
    api<{ links: SiteLinks; clicks: Clicks }>("/api/admin/site").then(apply, () => {});
  }, []);

  const save = async (body: Partial<Record<Field | "channelPhoto", string | null>>) => {
    setBusy(true);
    setMsg(null);
    try {
      apply(await api<{ links: SiteLinks; clicks: Clicks }>("/api/admin/site", { method: "PUT", body: JSON.stringify(body) }));
      setMsg({ text: t("adm_yt_saved") });
      router.refresh(); // the footer, header and menu get the new links right away
    } catch (e) {
      setMsg({ text: errText(e, t), bad: true });
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    // Square crop, 160×160 WebP, made in the browser (small enough for the database).
    const img = await createImageBitmap(f).catch(() => null);
    if (!img) return setMsg({ text: t("adm_yt_invalid_photo"), bad: true });
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const side = Math.min(img.width, img.height);
    c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 160, 160);
    let url = c.toDataURL("image/webp", 0.85);
    if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/png");
    await save({ channelPhoto: url });
  };

  if (!links) return null;
  const preview = {
    channelUrl: draft.channelUrl.trim() ? parseChannelUrl(draft.channelUrl) : null,
    explainer: draft.explainer.trim() ? parseYouTubeId(draft.explainer) : null,
    playlist: draft.playlist.trim() ? parsePlaylistId(draft.playlist) : null,
  };
  const saved = { channelUrl: links.channelUrl, explainer: links.explainerId, playlist: links.playlistId };
  const invalid: Record<Field, TKey> = { channelUrl: "adm_yt_invalid_channel", explainer: "adm_yt_invalid_video", playlist: "adm_yt_invalid_playlist" };
  const labels: Record<Field, TKey> = { channelUrl: "adm_yt_channel", explainer: "adm_yt_explainer", playlist: "adm_yt_playlist" };

  return (
    <section className="card p-5 space-y-5" aria-label={t("adm_yt_title")}>
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <IconVideoPlay size={22} /> {t("adm_yt_title")}
        </h2>
        <p className="text-sm text-muted">{t("adm_yt_sub")}</p>
      </div>

      {(["channelUrl", "explainer", "playlist"] as Field[]).map((f) => {
        const value = draft[f];
        const p = preview[f];
        return (
          <form
            key={f}
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void save({ [f]: value });
            }}
          >
            <label className="block text-sm font-semibold" htmlFor={`yt-${f}`}>
              {t(labels[f])}
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id={`yt-${f}`}
                dir="ltr"
                className="flex-1 min-w-[14rem] rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]"
                value={value}
                onChange={(e) => setDraft((d) => ({ ...d, [f]: e.target.value }))}
                placeholder={f === "channelUrl" ? "https://www.youtube.com/@…" : f === "explainer" ? "https://youtu.be/…" : "https://www.youtube.com/playlist?list=…"}
              />
              <button className="btn btn-primary !min-h-[44px]" disabled={busy || (!!value.trim() && !p)}>
                {t("adm_yt_save")}
              </button>
              {saved[f] && (
                <button type="button" className="btn btn-ghost !min-h-[44px] text-danger" disabled={busy} onClick={() => void save({ [f]: null })}>
                  {t("adm_yt_remove")}
                </button>
              )}
            </div>
            {/* live preview */}
            {value.trim() && !p && <p className="text-xs text-danger">{t(invalid[f])}</p>}
            {p && f === "channelUrl" && (
              <a href={p} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline" dir="ltr">
                <IconVideoPlay size={16} /> {p}
              </a>
            )}
            {p && f === "explainer" && (
              // eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail
              <img src={youtubeThumb(p)} alt="" className="w-48 aspect-video rounded-xl object-cover bg-surface-2" />
            )}
            {p && f === "playlist" && (
              <a href={`https://www.youtube.com/playlist?list=${p}`} target="_blank" rel="noopener noreferrer" className="text-sm underline" dir="ltr">
                list={p}
              </a>
            )}
            {!saved[f] && <p className="text-xs text-muted">{t("adm_yt_not_set")}</p>}
          </form>
        );
      })}

      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("adm_yt_photo")}</p>
        <div className="flex flex-wrap items-center gap-3">
          {links.channelPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- small data URL
            <img src={links.channelPhoto} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <span className="creator-avatar grid place-items-center w-12 h-12 rounded-full text-white font-extrabold">M</span>
          )}
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          <button type="button" className="btn btn-ghost !min-h-[40px]" disabled={busy} onClick={() => file.current?.click()}>
            {t("adm_yt_photo_pick")}
          </button>
          {links.channelPhoto && (
            <button type="button" className="btn btn-ghost !min-h-[40px] text-danger" disabled={busy} onClick={() => void save({ channelPhoto: null })}>
              {t("adm_yt_photo_remove")}
            </button>
          )}
        </div>
      </div>

      {clicks && (
        <div className="rounded-2xl bg-surface-2 p-3 text-sm space-y-1">
          <p className="font-bold">{fill(t("adm_yt_clicks"), { n: clicks.total })}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
            {CLICK_PLACES.map((p) => (
              <span key={p}>
                {t(`adm_place_${p}` as TKey)}: <b className="tabular-nums text-ink">{clicks.byPlace[p]}</b>
              </span>
            ))}
          </p>
        </div>
      )}

      {msg && (
        <p role="status" className={`text-sm ${msg.bad ? "text-danger" : "text-ok"}`}>
          {msg.text}
        </p>
      )}
    </section>
  );
}

interface Preview {
  youtubeId: string;
  title: string | null;
  author: string | null;
  ownChannel: boolean | null;
}

/** Admin: the vlogs of "☕ استراحة" — add by pasting a link of the owner's channel (with a preview). */
export function VlogsAdmin() {
  const { t } = useUI();
  const [vlogs, setVlogs] = useState<Vlog[] | null>(null);
  const [link, setLink] = useState("");
  const [desc, setDesc] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ vlogs: Vlog[] }>("/api/vlogs").then((d) => setVlogs(d.vlogs), () => {});
  }, []);

  const id = link.trim() ? parseYouTubeId(link) : null;
  useEffect(() => {
    setPreview(null);
    if (!id) return;
    let alive = true;
    const timer = setTimeout(() => {
      api<Preview>(`/api/admin/youtube-preview?link=${encodeURIComponent(id)}`).then(
        (p) => alive && setPreview(p),
        () => alive && setPreview({ youtubeId: id, title: null, author: null, ownChannel: null }),
      );
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);

  const add = async () => {
    setBusy(true);
    setMsg(null);
    try {
      setVlogs((await api<{ vlogs: Vlog[] }>("/api/admin/vlogs", { method: "POST", body: JSON.stringify({ link, description_ar: desc || undefined }) })).vlogs);
      setLink("");
      setDesc("");
    } catch (e) {
      setMsg(errText(e, t));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (youtubeId: string) => {
    setBusy(true);
    try {
      setVlogs((await api<{ vlogs: Vlog[] }>("/api/admin/vlogs", { method: "DELETE", body: JSON.stringify({ youtubeId }) })).vlogs);
    } catch (e) {
      setMsg(errText(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-4" aria-label={t("adm_vlog_title")}>
      <div>
        <h2 className="text-lg font-bold">{t("adm_vlog_title")}</h2>
        <p className="text-sm text-muted">{t("adm_vlog_sub")}</p>
      </div>
      <ul className="space-y-2">
        {vlogs?.map((v) => (
          <li key={v.youtubeId} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
            <img src={youtubeThumb(v.youtubeId)} alt="" loading="lazy" className="w-24 aspect-video rounded-lg object-cover shrink-0" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold truncate" dir="auto">
                {v.title}
              </span>
              <span className="text-xs text-muted" dir="ltr">
                {v.youtubeId}
              </span>
            </span>
            <button type="button" className="btn btn-ghost !min-h-[38px] text-danger" disabled={busy} onClick={() => void remove(v.youtubeId)}>
              {t("adm_vlog_delete")}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input dir="ltr" className="w-full rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" placeholder={t("adm_vlog_link")} aria-label={t("adm_vlog_link")} value={link} onChange={(e) => setLink(e.target.value)} />
        {link.trim() && !id && <p className="text-xs text-danger">{t("adm_yt_invalid_video")}</p>}
        {preview && (
          <div className="flex items-center gap-3 rounded-xl border border-line p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
            <img src={youtubeThumb(preview.youtubeId)} alt="" className="w-28 aspect-video rounded-lg object-cover" />
            <span className="text-sm min-w-0">
              {preview.title && (
                <span className="block font-semibold truncate" dir="auto">
                  {preview.title}
                </span>
              )}
              {preview.author && (
                <span className="text-xs text-muted" dir="auto">
                  {fill(t("adm_vlog_from"), { c: preview.author })}
                </span>
              )}
              {preview.ownChannel === false && <span className="block text-xs text-danger">{t("adm_vlog_not_mine")}</span>}
            </span>
          </div>
        )}
        <textarea dir="rtl" lang="ar" className="w-full rounded-xl border border-line bg-surface px-3 py-2 min-h-[4rem]" placeholder={t("adm_vlog_desc")} aria-label={t("adm_vlog_desc")} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="btn btn-primary !min-h-[44px]" disabled={busy || !id || preview?.ownChannel === false}>
          {t("adm_vlog_add")}
        </button>
      </form>
      {msg && (
        <p role="alert" className="text-sm text-danger">
          {msg}
        </p>
      )}
    </section>
  );
}
