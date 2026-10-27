"use client";

import { HistoryList } from "@/components/HistoryList";
import { useStats } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";

export default function ReportsPage() {
  const { t } = useUI();
  const { stats } = useStats();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">{t("reports_title")}</h1>
      <div className="card p-3 sm:p-5">{stats ? <HistoryList items={stats.history} /> : <p className="text-muted">{t("loading")}</p>}</div>
    </div>
  );
}
