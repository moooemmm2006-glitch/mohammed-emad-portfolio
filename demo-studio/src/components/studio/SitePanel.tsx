"use client";
import { useState } from "react";
import type { DemoDTO } from "@/lib/dto";
import { api, copyText } from "./api";
import { Icon } from "./Icon";
import { useToast } from "./StudioShell";

type Sub = { id: number; createdAt: number; data: Record<string, string> };

export function SitePanel({ demo, submissions }: { demo: DemoDTO; submissions: Sub[] }) {
  const toast = useToast();
  const [d, setD] = useState(demo);
  const [hook, setHook] = useState(demo.webhookUrl);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  async function patch(body: Record<string, unknown>, msg: string) {
    setBusy(true);
    try {
      const r = await api<{ demo: DemoDTO }>(`/api/studio/demos/${d.id}`, { method: "PATCH", body });
      setD(r.demo);
      toast({ text: msg, tone: "ok" });
    } catch (e) { toast({ text: (e as Error).message, tone: "err" }); }
    setBusy(false);
    setConfirmOff(false);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{d.name} · موقع حقيقي</h1>
      <section className={`card p-5 ${d.siteLive ? "border-[#7ee2b0]/30" : ""}`}>
        {d.siteLive ? (
          <>
            <p className="flex items-center gap-2 font-semibold text-[#7ee2b0]"><Icon name="check" size={18} />الموقع الحقيقي شغال</p>
            <p className="text-fg2 text-sm mt-1">من غير شريط النموذج، قابل للأرشفة في جوجل، والفورم بيوصل فعلاً.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <code className="flex-1 min-w-0 truncate rounded-xl bg-ink px-3 py-2.5 text-[14px] border border-white/10" dir="ltr">{d.siteUrl}</code>
              <button className="btn btn-ghost" onClick={async () => { await copyText(d.siteUrl); toast({ text: "اتنسخ ✓", tone: "ok" }); }}><Icon name="copy" size={16} />انسخ</button>
              <a className="btn btn-ghost" href={`/s/${d.slug}`} target="_blank" rel="noopener"><Icon name="eye" size={16} />افتح</a>
            </div>
            <div className="mt-4">
              {confirmOff ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">تقفل الموقع الحقيقي؟ اللينك هيبطل يفتح.
                  <button className="btn btn-danger btn-sm" autoFocus disabled={busy} onClick={() => patch({ siteLive: false }, "اتقفل الموقع")}>اقفله</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmOff(false)}>لأ</button>
                </span>
              ) : <button className="text-[13px] text-[#ff8a8f]" onClick={() => setConfirmOff(true)}>إيقاف الموقع الحقيقي</button>}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-semibold text-lg">حوّله لموقع حقيقي 🚀</h2>
            <p className="text-fg2 text-sm mt-1 mb-4">بيعمل نسخة على <code dir="ltr">/s/{d.slug}</code>: من غير شريط النموذج، قابلة للأرشفة، والحجوزات بتوصل على واتساب البيزنس وبتتسجل هنا (وفي شيت لو حطيت ويب هوك).</p>
            <button className="btn btn-primary" disabled={busy} onClick={() => patch({ siteLive: true, status: "won" }, "مبروك! الموقع الحقيقي شغال 🎉")}><Icon name="rocket" size={16} />حوّله لموقع حقيقي</button>
          </>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-1">ويب هوك (Google Sheets / n8n)</h2>
        <p className="text-fg2 text-sm mb-3">كل حجز بيتبعت POST JSON بالشكل ده: <code dir="ltr" className="text-[12.5px]">{`{ site, slug, fields, createdAt }`}</code></p>
        <div className="flex flex-wrap gap-2">
          <input className="field flex-1 min-w-[240px]" dir="ltr" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="https://your-n8n.example.com/webhook/…" />
          <button className="btn btn-primary" disabled={busy} onClick={() => patch({ webhookUrl: hook }, "اتحفظ الويب هوك")}>احفظ</button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-1">تصدير (ZIP)</h2>
        <p className="text-fg2 text-sm mb-3">نسخة HTML/CSS ثابتة للعملاء اللي عايزين استضافة تانية. الفورم فيها بيفتح واتساب برسالة جاهزة.</p>
        <a className="btn btn-ghost" href={`/api/studio/demos/${d.id}/export`}><Icon name="download" size={16} />نزّل ZIP</a>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">الحجوزات اللي وصلت ({submissions.length})</h2>
        {submissions.length === 0 ? <p className="text-fg2 text-sm">لسه مفيش.</p> : (
          <ul className="divide-y divide-white/[.06]">
            {submissions.map((s) => (
              <li key={s.id} className="py-3 text-sm">
                <p className="text-fg3 text-[12.5px] mb-1">{new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" }).format(s.createdAt)}</p>
                <dl className="flex flex-wrap gap-x-5 gap-y-1">{Object.entries(s.data).map(([k, v]) => <div key={k}><dt className="inline text-fg2">{k}: </dt><dd className="inline">{v}</dd></div>)}</dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-2">دومين خاص بالعميل</h2>
        <ol className="list-decimal ps-5 space-y-1.5 text-sm text-fg2">
          <li>في Vercel افتح مشروع demo-studio ← Settings ← Domains ← Add، واكتب دومين العميل (مثلاً englishdose.com).</li>
          <li>عند شركة الدومين: سجل A للدومين الرئيسي على <code dir="ltr">76.76.21.21</code>، وسجل CNAME لـ <code dir="ltr">www</code> على <code dir="ltr">cname.vercel-dns.com</code>.</li>
          <li>في Environment Variables ضيف (أو كمّل) <code dir="ltr">CUSTOM_DOMAINS</code> = <code dir="ltr">{"englishdose.com="}{d.slug}</code> واعمل Redeploy. الدومين هيفتح الموقع ده على طول.</li>
        </ol>
      </section>
    </div>
  );
}
