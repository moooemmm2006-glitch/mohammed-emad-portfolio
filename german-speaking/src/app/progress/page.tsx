"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HistoryList } from "@/components/HistoryList";
import { BookProgressCard } from "@/components/book/BookProgressCard";
import { IconClock, IconFile, IconFlame, IconMic } from "@/components/Icons";
import { useStats } from "@/lib/client/api";
import type { TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { tagLabel } from "@/lib/levels";
import { ScoreKeys } from "@/lib/report/schema";
import type { WeaknessStatus } from "@/lib/report/weakness";

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)"];
const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: { stroke: "var(--line)" } } as const;
const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--ink)", fontSize: 13 },
  labelStyle: { color: "var(--muted)" },
  itemStyle: { color: "var(--ink)" },
};
// Legend labels use text tokens; the colored swatch carries the series identity.
const legendText = (value: string) => <span style={{ color: "var(--muted)" }}>{value}</span>;

const STATUS_STYLE: Record<WeaknessStatus, string> = {
  new: "bg-gold/15 text-gold",
  persisting: "bg-danger/15 text-danger",
  improving: "bg-ok/15 text-ok",
  resolved: "bg-surface-2 text-muted",
};

export default function ProgressPage() {
  const { t, lang } = useUI();
  const { stats } = useStats();
  if (!stats) return <p className="py-20 text-center text-muted">{t("loading")}</p>;

  const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" });
  const open = stats.weaknesses.filter((w) => w.status !== "resolved");
  const resolved = stats.weaknesses.filter((w) => w.status === "resolved");
  const scoreName = (k: string) => t(`score_${k}` as TKey);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">{t("progress_title")}</h1>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile icon={<IconFile />} value={stats.totals.sessions} label={t("stats_sessions")} />
        <Tile icon={<IconClock />} value={stats.totals.minutes} label={t("stats_minutes")} />
        <Tile icon={<IconMic />} value={stats.totals.words} label={t("stats_words")} />
        <Tile icon={<IconFlame />} value={stats.totals.streak} label={t("stats_streak")} />
      </section>

      <BookProgressCard />

      {stats.scoreTimeline.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          <p>{t("progress_empty")}</p>
          <Link href="/speak" className="btn btn-primary mt-4">
            <IconMic /> {t("nav_speak")}
          </Link>
        </div>
      ) : (
        <>
          <ChartCard title={t("progress_scores")}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.scoreTimeline.map((s) => ({ ...s, label: short(s.date) }))} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis domain={[0, 100]} {...axis} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                {ScoreKeys.map((k, i) => (
                  <Line key={k} type="monotone" dataKey={k} name={scoreName(k)} stroke={SERIES[i]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "var(--surface)" }} activeDot={{ r: 6 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted">{lang === "ar" ? "اعرض كجدول" : "Show as table"}</summary>
              <div className="overflow-x-auto mt-2" dir="ltr">
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="text-muted">
                      <th className="text-start p-1">{t("info_date")}</th>
                      <th className="p-1">{t("info_level")}</th>
                      {ScoreKeys.map((k) => (
                        <th key={k} className="p-1">
                          {scoreName(k)}
                        </th>
                      ))}
                      <th className="p-1">Σ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.scoreTimeline.map((s) => (
                      <tr key={s.sessionId} className="border-t border-line text-center">
                        <td className="text-start p-1">{s.date}</td>
                        <td className="p-1">{s.level}</td>
                        {ScoreKeys.map((k) => (
                          <td key={k} className="p-1">
                            {(s as unknown as Record<string, number>)[k]}
                          </td>
                        ))}
                        <td className="p-1 font-bold">{s.overall}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title={t("progress_minutes")}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.days.map((d) => ({ ...d, label: short(d.day) }))} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" {...axis} interval={1} />
                  <YAxis allowDecimals={false} {...axis} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
                  <Bar dataKey="minutes" name={t("stats_minutes")} fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("progress_mistakes")}>
              {stats.topTags.length === 0 ? (
                <p className="text-muted text-sm">—</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.mistakeTrend.map((d) => ({ ...d, label: short(String(d.date)) }))} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis allowDecimals={false} {...axis} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                    {stats.topTags.map((tag, i) => (
                      <Bar
                        key={tag}
                        dataKey={tag}
                        name={tagLabel(tag, lang)}
                        stackId="m"
                        fill={SERIES[i]}
                        stroke="var(--surface)"
                        strokeWidth={2}
                        radius={i === stats.topTags.length - 1 ? [4, 4, 0, 0] : 0}
                        maxBarSize={28}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold mb-3">{t("progress_weak")}</h2>
        {open.length === 0 ? (
          <p className="text-muted text-sm">{t("progress_weak_empty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {open.map((w) => (
              <li key={w.tag} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <b>{tagLabel(w.tag, lang)}</b>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[w.status]}`}>{t(`status_${w.status}` as TKey)}</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {w.totalCount} {t("times")} · {t("first_seen")}: {short(w.firstSeen.slice(0, 10))} · {t("last_seen")}: {short(w.lastSeen.slice(0, 10))}
                </p>
                <div className="flex gap-1 mt-2 items-end h-6" aria-hidden="true" dir="ltr">
                  {w.history.slice(-10).map((h, i) => (
                    <span key={i} className="w-3 rounded-sm bg-accent" style={{ height: `${Math.max(3, Math.min(24, h.count * 6))}px`, background: h.count ? "var(--series-2)" : "var(--line)" }} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        {resolved.length > 0 && (
          <p className="mt-4 text-sm">
            <b className="text-ok">✓ {t("progress_resolved")}:</b> {resolved.map((w) => tagLabel(w.tag, lang)).join(" · ")}
          </p>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold mb-3">{t("progress_history")}</h2>
        <HistoryList items={stats.history} />
      </section>
    </div>
  );
}

function Tile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className="grid place-items-center w-10 h-10 rounded-xl bg-surface-2 text-gold">{icon}</span>
      <div>
        <div className="text-2xl font-extrabold tabular-nums">{value}</div>
        <div className="text-sm text-muted">{label}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <div dir="ltr">{children}</div>
    </section>
  );
}
