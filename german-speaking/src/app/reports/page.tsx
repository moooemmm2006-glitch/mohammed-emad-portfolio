"use client";

import { GeminiReports } from "@/components/gemini/GeminiReports";
import { HistoryList } from "@/components/HistoryList";
import { useStats } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";

export default function ReportsPage() {
  const { t } = useUI();
  const { stats } = useStats();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">{t("reports_title")}</h1>
      {/* Gemini reports first; earlier in-site conversations stay readable below. */}
      <GeminiReports showEmpty={!!stats && stats.history.length === 0} />
      {!stats ? <p className="text-muted">{t("loading")}</p> : stats.history.length > 0 && <div className="card p-3 sm:p-5"><HistoryList items={stats.history} /></div>}
    </div>
  );
}
