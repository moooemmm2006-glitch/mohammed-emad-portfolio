"use client";

import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { parseYouTubeSource, type PodcastItem } from "@/lib/podcastShared";

export function PodcastsAdmin() {
  const { t } = useUI();
  const [items, setItems] = useState<PodcastItem[] | null>(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [levels, setLevels] = useState<("B1" | "B2")[]>(["B1", "B2"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => api<{ podcasts: PodcastItem[] }>("/api/admin/podcasts").then((d) => setItems(d.podcasts), () => {});
  useEffect(() => { void load(); }, []);
  const add = async () => {
    setBusy(true); setError("");
    try {
      const data = await api<{ podcasts: PodcastItem[] }>("/api/admin/podcasts", { method: "POST", body: JSON.stringify({ link, title: title.trim() || undefined, levels }) });
      setItems(data.podcasts); setLink(""); setTitle("");
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      setError(code === "invalid_link" ? t("adm_pod_invalid") : code === "video_not_found" ? t("adm_pod_missing") : code === "wrong_channel" ? t("adm_pod_channel") : code === "channel_unverified" ? t("adm_pod_unverified") : t("adm_pod_error"));
    } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true); setError("");
    try { setItems((await api<{ podcasts: PodcastItem[] }>("/api/admin/podcasts", { method: "DELETE", body: JSON.stringify({ id }) })).podcasts); }
    catch { setError(t("adm_pod_error")); }
    finally { setBusy(false); }
  };
  const valid = !!parseYouTubeSource(link);

  return (
    <section className="card p-5 space-y-4" aria-label={t("adm_pod_title")}>
      <header><h2 className="text-lg font-bold">🎙️ {t("adm_pod_title")}</h2><p className="text-sm text-muted">{t("adm_pod_sub")}</p></header>
      <ul className="space-y-2">
        {items?.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold" dir="auto">{item.title}</span><span className="text-xs text-muted">{item.channel} · {item.levels.join(" / ")}</span>{item.added && <span className="chip ms-2 !min-h-0 !py-0 text-xs">{t("adm_vid_added_tag")}</span>}</span>
          {item.added && <button type="button" className="btn btn-ghost !min-h-[36px] text-danger" disabled={busy} onClick={() => void remove(item.id)}>{t("adm_pod_remove")}</button>}
        </li>)}
      </ul>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <label className="text-sm"><span className="mb-1 block text-muted">{t("adm_pod_link")}</span><input dir="ltr" required value={link} onChange={(e) => setLink(e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" placeholder="https://youtube.com/watch?v=…" /></label>
        <label className="text-sm"><span className="mb-1 block text-muted">{t("adm_pod_item_title")}</span><input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" /></label>
        <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="mb-1 text-muted">{t("adm_pod_levels")}</legend>{(["B1", "B2"] as const).map((level) => <label key={level} className="flex items-center gap-2"><input type="checkbox" checked={levels.includes(level)} onChange={(e) => setLevels((old) => e.target.checked ? [...old, level] : old.filter((x) => x !== level))} />{level}</label>)}</fieldset>
        {link && !valid && <p className="text-sm text-danger">{t("adm_pod_invalid")}</p>}
        <button className="btn btn-primary !min-h-[44px] w-fit" disabled={busy || !valid || !levels.length}>{t("adm_pod_add")}</button>
      </form>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
