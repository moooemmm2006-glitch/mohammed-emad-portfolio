"use client";

import { localeOf, type UILang } from "@/lib/client/i18n";
import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { ApiError, api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import type { StudentRow } from "@/lib/admin";
import { TopicVideosAdmin } from "@/components/admin/TopicVideosAdmin";
import { ChannelAdmin, VlogsAdmin } from "@/components/admin/ChannelAdmin";
import { ProductivityAdmin } from "@/components/admin/ProductivityAdmin";
import { PodcastsAdmin } from "@/components/admin/PodcastsAdmin";
import { FilmsAdmin } from "@/components/admin/FilmsAdmin";
import { SprachcafeAdmin } from "@/components/admin/SprachcafeAdmin";
import { LevelReviewsAdmin } from "@/components/admin/LevelReviewsAdmin";

export default function AdminDashboard() {
  const { t } = useUI();
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ students: StudentRow[]; me: string }>("/api/admin/users");
      setStudents(r.students);
      setMe(r.me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setForbidden(true);
    }
  }, []);
  useEffect(() => void load(), [load]);

  if (forbidden) return <p className="card p-6 text-center">{t("admin_forbidden")}</p>;
  if (!students) return <p className="text-muted">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t("admin_title")}</h1>
        <p className="text-muted">{t("admin_sub")}</p>
      </header>
      {students.length === 0 && <p className="card p-6 text-muted">{t("admin_empty")}</p>}
      <ul className="grid gap-4 lg:grid-cols-2">
        {students.map((s) => (
          <StudentCard key={s.id} s={s} self={s.id === me} onChange={load} />
        ))}
      </ul>
      <ChannelAdmin />
      <VlogsAdmin />
      <ProductivityAdmin />
      <TopicVideosAdmin />
      <PodcastsAdmin />
      <FilmsAdmin />
      <LevelReviewsAdmin />
      <SprachcafeAdmin />
    </div>
  );
}

function fmt(ms: number | null, lang: UILang) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(localeOf(lang), { dateStyle: "medium", timeStyle: ms > Date.now() - 864e5 ? "short" : undefined });
}

function StudentCard({ s, self, onChange }: { s: StudentRow; self: boolean; onChange: () => void }) {
  const { t, lang } = useUI();
  const [temp, setTemp] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await fn();
      if (done) setNote(done);
      onChange();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };
  const patch = (body: object) => api(`/api/admin/users/${s.id}`, { method: "PATCH", body: JSON.stringify(body) });

  return (
    <li className={`card p-5 space-y-4 ${s.disabled ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        <UserAvatar name={s.name} username={s.username} photo={null} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate">
            {s.name}
            {self && <span className="text-muted font-normal"> ({t("admin_you")})</span>}
          </p>
          <p className="text-sm text-muted" dir="ltr">
            @{s.username}
          </p>
        </div>
        {s.role === "admin" && <span className="chip text-xs">{t("me_admin_badge")}</span>}
        {s.disabled && <span className="chip text-xs text-danger">{t("admin_disabled_badge")}</span>}
      </div>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <Stat label={t("admin_joined")} value={fmt(s.createdAt, lang)} />
        <Stat label={t("admin_last")} value={fmt(s.lastActiveAt, lang)} />
        <Stat label={t("admin_sessions")} value={String(s.sessions)} />
      </dl>

      {!self && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-ghost !min-h-[38px] text-sm"
              disabled={busy}
              onClick={() =>
                confirm(t("admin_reset_confirm")) &&
                void run(async () => setTemp((await api<{ password: string }>(`/api/admin/users/${s.id}/password`, { method: "POST" })).password))
              }
            >
              {t("admin_reset")}
            </button>
            <button className="btn btn-ghost !min-h-[38px] text-sm" disabled={busy} onClick={() => void run(() => patch({ disabled: !s.disabled }))}>
              {s.disabled ? t("admin_enable") : t("admin_disable")}
            </button>
            <button
              className="btn btn-ghost !min-h-[38px] text-sm text-danger"
              disabled={busy}
              onClick={() => confirm(t("admin_delete_confirm")) && void run(() => api(`/api/admin/users/${s.id}`, { method: "DELETE" }))}
            >
              {t("admin_delete")}
            </button>
          </div>
        </>
      )}

      {temp && (
        <div role="status" className="rounded-xl bg-surface-2 p-3 text-sm space-y-2">
          <p>{t("admin_reset_done")}</p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="font-mono text-base font-bold select-all">
              {temp}
            </code>
            <button
              className="btn btn-ghost !min-h-[32px] !py-1 text-xs"
              onClick={() => navigator.clipboard?.writeText(temp).then(() => setNote(t("admin_copied")), () => {})}
            >
              {t("admin_copy")}
            </button>
          </div>
        </div>
      )}
      {note && (
        <p role="status" className="text-sm text-muted">
          {note}
        </p>
      )}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
