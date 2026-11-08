import { notFound } from "next/navigation";
import { DemoTabs } from "@/components/studio/DemoTabs";
import { Icon } from "@/components/studio/Icon";
import { RefreshOnActivity } from "@/components/studio/RefreshOnActivity";
import { StudioShell } from "@/components/studio/StudioShell";
import { arAgo } from "@/lib/expiry";
import { demoTimeline, getDemo } from "@/lib/repo";
import { callHint, deviceLabel, EVENT_LABEL, formatDuration, SECTION_LABEL } from "@/lib/tracking";

export const dynamic = "force-dynamic";

const fmt = (ms: number) => new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(ms);

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getDemo(id);
  if (!d) notFound();
  const { events, visits } = await demoTimeline(id, 120);
  const now = Date.now();
  const hint = callHint(d.lastOpenedAt, now);
  const totalTime = visits.reduce((s, v) => s + v.durationMs, 0);
  const maxScroll = visits.reduce((m, v) => Math.max(m, v.maxScroll), 0);
  const sections = [...new Set(visits.flatMap((v) => { try { return JSON.parse(v.sections) as string[]; } catch { return []; } }))];
  const tones = { hot: "border-hot/50 bg-[#2a1a10]", warm: "border-[#ffcf70]/30 bg-[#2a2310]", cold: "border-white/10", none: "border-white/10" };

  return (
    <StudioShell>
      <RefreshOnActivity />
      <DemoTabs id={id} active="activity" />
      <h1 className="text-2xl font-semibold mb-4">{d.name} · النشاط</h1>
      <div className={`card p-4 mb-5 flex items-center gap-3 ${tones[hint.tone]}`}>
        {hint.tone === "hot" && <span className="size-2.5 rounded-full bg-hot hot-dot" />}
        <p className="font-medium">{hint.text}</p>
        {d.content.phone && <a href={`tel:${d.content.phone}`} className="ms-auto btn btn-primary btn-sm"><Icon name="phone" size={15} />اتصل</a>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          ["زيارات فريدة", String(d.views)],
          ["أول فتح", d.firstOpenedAt ? arAgo(d.firstOpenedAt, now) : "—"],
          ["وقت التصفح", formatDuration(totalTime)],
          ["أقصى سكرول", `${maxScroll}%`],
        ].map(([l, v]) => (
          <div key={l} className="card p-4"><div className="text-fg3 text-[13px]">{l}</div><div className="text-xl font-semibold mt-0.5">{v}</div></div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="card p-5">
          <h2 className="font-semibold mb-4">الخط الزمني</h2>
          {events.length === 0 ? <p className="text-fg2">لسه مفيش نشاط. زياراتك وإنت داخل الاستوديو مش بتتحسب.</p> : (
            <ol className="relative border-s border-white/10 ms-2 space-y-4">
              {events.map((e) => (
                <li key={e.id} className="ms-5">
                  <span className={`absolute -start-[6px] mt-1.5 size-3 rounded-full ${e.type === "cta_contact" || e.type === "open" ? "bg-hot" : "bg-cobalt"}`} />
                  <p className="font-medium">{EVENT_LABEL[e.type] || e.type}{e.label && !["bar", "sticky", "modal", "hero", "nav"].includes(e.label) && e.type !== "open" && e.type !== "reopen" ? <span className="text-fg2 font-normal"> — {e.label.replace(/^(item|slot|product):/, "")}</span> : null}</p>
                  <p className="text-[13px] text-fg3">{fmt(e.createdAt)} · {arAgo(e.createdAt, now)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-semibold mb-3">الأقسام اللي اتشافت</h2>
            {sections.length ? <div className="flex flex-wrap gap-2">{sections.map((s) => <span key={s} className="chip bg-white/[.06]">{SECTION_LABEL[s] || s}</span>)}</div> : <p className="text-fg2 text-sm">—</p>}
          </section>
          <section className="card p-5">
            <h2 className="font-semibold mb-3">الزيارات</h2>
            <ul className="divide-y divide-white/[.06]">
              {visits.map((v) => (
                <li key={v.id} className="py-2.5 text-sm flex flex-wrap gap-x-3 gap-y-1">
                  <span className="font-medium">{deviceLabel(v.device)}</span>
                  <span className="text-fg2">{fmt(v.startedAt)}</span>
                  <span className="text-fg3">{formatDuration(v.durationMs)} د · {v.maxScroll}%</span>
                </li>
              ))}
              {!visits.length && <li className="text-fg2 text-sm">—</li>}
            </ul>
          </section>
        </div>
      </div>
    </StudioShell>
  );
}
