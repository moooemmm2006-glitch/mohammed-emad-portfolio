"use client";

import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { YOUTUBE_ID } from "@/lib/easyGermanShared";
import type { FilmItem } from "@/lib/filmsShared";

export function FilmsAdmin() {
  const { t } = useUI();
  const [items, setItems] = useState<FilmItem[] | null>(null);
  const [form, setForm] = useState({ title: "", year: String(new Date().getFullYear()), genre: "", summary: "", usefulness: "", youtubeId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => api<{ films: FilmItem[] }>("/api/admin/films").then((d) => setItems(d.films), () => {});
  useEffect(() => { void load(); }, []);
  const update = (key: keyof typeof form, value: string) => setForm((s) => ({ ...s, [key]: value }));
  const add = async () => {
    setBusy(true); setError("");
    try {
      const data = await api<{ films: FilmItem[] }>("/api/admin/films", { method: "POST", body: JSON.stringify({ ...form, year: Number(form.year), youtubeId: form.youtubeId.trim() || undefined }) });
      setItems(data.films); setForm({ title: "", year: String(new Date().getFullYear()), genre: "", summary: "", usefulness: "", youtubeId: "" });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      setError(code === "video_not_found" ? t("adm_film_video_missing") : code === "video_unverified" ? t("adm_film_video_unverified") : code === "invalid_body" ? t("adm_film_invalid") : t("adm_film_error"));
    } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!confirm(t("adm_film_remove_confirm"))) return;
    setBusy(true); setError("");
    try { setItems((await api<{ films: FilmItem[] }>("/api/admin/films", { method: "DELETE", body: JSON.stringify({ id }) })).films); }
    catch { setError(t("adm_film_error")); }
    finally { setBusy(false); }
  };

  return (
    <section className="card p-5 space-y-4" aria-label={t("adm_film_title")}>
      <header><h2 className="text-lg font-bold">🍿 {t("adm_film_title")}</h2><p className="text-sm text-muted">{t("adm_film_sub")}</p></header>
      <ul className="space-y-2">
        {items?.map((film) => <li key={film.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3"><span className="min-w-0 flex-1 truncate font-semibold" dir="auto">{film.title}</span><button type="button" className="btn btn-ghost !min-h-[36px] text-danger" disabled={busy} onClick={() => void remove(film.id)}>{t("adm_film_remove")}</button></li>)}
      </ul>
      <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <input required value={form.title} onChange={(e) => update("title", e.target.value)} placeholder={t("adm_film_name")} aria-label={t("adm_film_name")} className="rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" />
        <input required type="number" min={1900} max={2100} value={form.year} onChange={(e) => update("year", e.target.value)} placeholder={t("adm_film_year")} aria-label={t("adm_film_year")} className="rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" />
        <input value={form.genre} onChange={(e) => update("genre", e.target.value)} placeholder={t("adm_film_genre")} aria-label={t("adm_film_genre")} className="rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" />
        <input dir="ltr" value={form.youtubeId} onChange={(e) => update("youtubeId", e.target.value)} placeholder={t("adm_film_youtube")} aria-label={t("adm_film_youtube")} className="rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" />
        <textarea required minLength={10} maxLength={1000} value={form.summary} onChange={(e) => update("summary", e.target.value)} placeholder={t("adm_film_summary")} aria-label={t("adm_film_summary")} className="sm:col-span-2 rounded-xl border border-line bg-surface px-3 py-2 min-h-20" />
        <input value={form.usefulness} onChange={(e) => update("usefulness", e.target.value)} placeholder={t("adm_film_useful")} aria-label={t("adm_film_useful")} className="sm:col-span-2 rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]" />
        {form.youtubeId && !YOUTUBE_ID.test(form.youtubeId.trim()) && <p className="sm:col-span-2 text-sm text-danger">{t("adm_film_invalid_video")}</p>}
        <button className="btn btn-primary !min-h-[44px] w-fit" disabled={busy || !form.title.trim() || form.summary.trim().length < 10 || (!!form.youtubeId && !YOUTUBE_ID.test(form.youtubeId.trim()))}>{t("adm_film_add")}</button>
      </form>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
