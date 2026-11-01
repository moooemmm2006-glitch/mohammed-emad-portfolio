"use client";

import { useCallback, useEffect, useState } from "react";
import { Stars } from "@/components/sprachcafe/CafeReviews";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";

// Admin: learners' opinions of the levels wait here until you approve them (or hide / delete them).

type Row = { id: string; level: string; rating: number; comment: string; name: string; status: string; at: number };
const TABS = ["pending", "approved", "rejected"] as const;

export function LevelReviewsAdmin() {
  const { t } = useUI();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [rows, setRows] = useState<Row[] | null>(null);
  const load = useCallback(() => api<{ reviews: Row[] }>(`/api/admin/level-reviews?status=${tab}`).then((r) => setRows(r.reviews), () => setRows([])), [tab]);
  useEffect(() => void load(), [load]);
  const act = async (id: string, status: "approved" | "rejected") => {
    await api("/api/admin/level-reviews", { method: "PATCH", body: JSON.stringify({ id, status }) }).catch(() => {});
    await load();
  };
  const remove = async (id: string) => {
    if (!window.confirm(t("lrev_adm_delete_confirm"))) return;
    await api(`/api/admin/level-reviews?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    await load();
  };
  return (
    <section className="space-y-4 border-t border-line pt-8" data-testid="level-reviews-admin">
      <header>
        <h2 className="text-2xl font-extrabold">💬 {t("lrev_adm_title")}</h2>
        <p className="mt-1 text-muted">{t("lrev_adm_sub")}</p>
      </header>
      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={tab === s} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === s ? "bg-ink text-surface" : "bg-surface-2 text-muted"}`} onClick={() => setTab(s)}>
            {t(`lrev_adm_${s}`)}
          </button>
        ))}
      </div>
      {!rows ? (
        <p className="text-muted">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="card p-5 text-muted">{t("lrev_adm_empty")}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">
                  {r.name} <span className="ms-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{r.level === "SITE" ? t("lrev_tab_site") : r.level}</span>
                </p>
                <Stars value={r.rating} />
              </div>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words" dir="auto">
                {r.comment}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {r.status !== "approved" && (
                  <button type="button" className="btn btn-primary !min-h-[38px] text-sm" onClick={() => void act(r.id, "approved")}>
                    {t("lrev_adm_approve")}
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button type="button" className="btn btn-ghost !min-h-[38px] text-sm" onClick={() => void act(r.id, "rejected")}>
                    {t("lrev_adm_hide")}
                  </button>
                )}
                <button type="button" className="text-sm text-danger underline min-h-[38px]" onClick={() => void remove(r.id)}>
                  {t("lrev_adm_delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
