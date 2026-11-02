"use client";

import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/client/api";
import type { TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { CREATORS, CREATOR_INFO, PRODUCTIVITY_KINDS, type Creator, type ProductivityItem, type ProductivityKind } from "@/lib/productivityShared";

const ERR: Record<string, TKey> = {
  invalid_video: "adm_yt_invalid_video",
  video_not_found: "adm_vlog_not_found",
  invalid_channel: "adm_yt_invalid_channel",
  invalid_link: "adm_prod_invalid_link",
  title_needed: "adm_prod_title_needed",
};
const KIND_LABEL: Record<ProductivityKind, TKey> = { video: "adm_prod_video", course: "prod_course", channel: "adm_prod_channel", featured: "adm_prod_featured" };

/** Admin: 🎯 the productivity section — per creator: YouTube videos, course links and the channel link. */
export function ProductivityAdmin() {
  const { t } = useUI();
  const [items, setItems] = useState<ProductivityItem[] | null>(null);
  const [creator, setCreator] = useState<Creator>("abouzeid");
  const [kind, setKind] = useState<ProductivityKind>("video");
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ items: ProductivityItem[] }>("/api/productivity").then((d) => setItems(d.items), () => {});
  }, []);

  const send = async (method: "POST" | "DELETE", body: unknown) => {
    setBusy(true);
    setMsg(null);
    try {
      setItems((await api<{ items: ProductivityItem[] }>("/api/admin/productivity", { method, body: JSON.stringify(body) })).items);
      return true;
    } catch (e) {
      setMsg(t(ERR[e instanceof ApiError ? e.code : ""] ?? "adm_vid_error"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-xl border border-line bg-surface px-3 py-2 min-h-[44px]";
  return (
    <section id="productivity" className="card p-5 space-y-4" aria-label={t("adm_prod_title")} data-testid="admin-productivity">
      <div>
        <h2 className="text-lg font-bold">{t("adm_prod_title")}</h2>
        <p className="text-sm text-muted">{t("adm_prod_sub")}</p>
      </div>
      {CREATORS.map((c) => {
        const list = (items ?? []).filter((i) => i.creator === c);
        if (list.length === 0) return null;
        return (
          <div key={c} className="space-y-2">
            <h3 className="font-bold">{CREATOR_INFO[c].ar}</h3>
            <ul className="space-y-2">
              {list.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2">
                  <span className="chip text-xs shrink-0">{t(KIND_LABEL[i.kind])}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-semibold truncate" dir="auto">{i.title}</span>
                    <span className="block text-xs text-muted truncate" dir="ltr">{i.url}</span>
                  </span>
                  <button type="button" className="btn btn-ghost !min-h-[38px] text-danger" disabled={busy} onClick={() => void send("DELETE", { id: i.id })}>
                    {t("adm_vlog_delete")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await send("POST", { creator, kind, link, title: title || undefined })) {
            setLink("");
            setTitle("");
          }
        }}
      >
        <select className={field} value={creator} onChange={(e) => setCreator(e.target.value as Creator)} aria-label={t("prod_channel")}>
          {CREATORS.map((c) => (
            <option key={c} value={c}>{CREATOR_INFO[c].ar}</option>
          ))}
        </select>
        <select className={field} value={kind} onChange={(e) => setKind(e.target.value as ProductivityKind)} aria-label={t("adm_prod_link")}>
          {PRODUCTIVITY_KINDS.map((k) => (
            <option key={k} value={k}>{t(KIND_LABEL[k])}</option>
          ))}
        </select>
        <input dir="ltr" required className={`${field} sm:col-span-2`} placeholder={t("adm_prod_link")} aria-label={t("adm_prod_link")} value={link} onChange={(e) => setLink(e.target.value)} />
        <input dir="auto" className={`${field} sm:col-span-2`} placeholder={t("adm_prod_name")} aria-label={t("adm_prod_name")} value={title} onChange={(e) => setTitle(e.target.value)} />
        {msg && <p className="text-sm text-danger sm:col-span-2" role="alert">{msg}</p>}
        <button type="submit" className="btn btn-primary sm:col-span-2" disabled={busy || !link.trim()}>
          {t("adm_prod_add")}
        </button>
      </form>
    </section>
  );
}
