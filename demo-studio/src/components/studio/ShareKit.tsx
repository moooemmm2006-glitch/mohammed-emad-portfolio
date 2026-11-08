"use client";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { NICHE_LABEL, STATUS_LABEL, type Niche, type Status } from "@/lib/demo/model";
import type { DemoDTO } from "@/lib/dto";
import { arDate } from "@/lib/expiry";
import { normalizeEgPhone, toIntl } from "@/lib/phone";
import { fillPreset, PRESET_KEYS, PRESET_LABEL, type Settings } from "@/lib/settings";
import { api, copyText } from "./api";
import { Icon } from "./Icon";
import { useToast } from "./StudioShell";

export function ShareKit({ demo, presets, script }: { demo: DemoDTO; presets: Settings["presets"]; script: string[] }) {
  const toast = useToast();
  const [d, setD] = useState(demo);
  const [preset, setPreset] = useState<(typeof PRESET_KEYS)[number]>(d.status === "opened" || d.status === "sent" ? "followUp" : "default");
  const [msg, setMsg] = useState("");
  const [to, setTo] = useState(normalizeEgPhone(d.content.whatsapp || d.content.phone) || d.content.whatsapp || d.content.phone);
  const [qr, setQr] = useState("");
  const isDraft = d.status === "draft" || d.status === "request";
  const link = d.url;

  useEffect(() => { setMsg(fillPreset(presets[preset], { name: d.name, link })); }, [preset, presets, d.name, link]);
  useEffect(() => {
    QRCode.toDataURL(link, { width: 720, margin: 2, errorCorrectionLevel: "M", color: { dark: "#0B0D12", light: "#FFFFFF" } }).then(setQr).catch(() => {});
  }, [link]);

  const waHref = useMemo(() => {
    const n = toIntl(to);
    return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
  }, [to, msg]);

  async function publish() {
    try {
      const r = await api<{ demo: DemoDTO }>(`/api/studio/demos/${d.id}`, { method: "PATCH", body: { status: "sent" } });
      setD(r.demo);
      toast({ text: "اتنشر ✓ اللينك شغال دلوقتي", tone: "ok" });
    } catch (e) { toast({ text: (e as Error).message, tone: "err" }); }
  }
  async function markSent() {
    if (d.status !== "draft" && d.status !== "request") return;
    await publish();
  }
  const copy = async (text: string, label: string) => { if (await copyText(text)) toast({ text: `${label} اتنسخ ✓`, tone: "ok" }); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">{d.name}</h1>
          <p className="text-fg2 text-sm">{NICHE_LABEL[d.niche as Niche]} · {STATUS_LABEL[d.status as Status]} · متاح لحد {arDate(d.expiresAt)}</p>
        </div>
      </div>

      {isDraft && (
        <div className="card border-[#ffcf70]/40 p-4 flex flex-wrap items-center gap-3">
          <span className="text-[#ffcf70]">⚠️ النموذج لسه مسودة: اللينك مش هيفتح لحد غيرك.</span>
          <button className="btn btn-primary btn-sm ms-auto" onClick={publish}><Icon name="rocket" size={15} />انشره دلوقتي</button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          {/* Link */}
          <section className="card p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Icon name="link" size={17} />اللينك</h2>
            <div className="flex flex-wrap gap-2">
              <code className="flex-1 min-w-0 truncate rounded-xl bg-ink px-3 py-2.5 text-[14px] border border-white/10" dir="ltr">{link}</code>
              <button className="btn btn-primary" onClick={() => copy(link, "اللينك")}><Icon name="copy" size={16} />انسخ</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a className="btn btn-ghost btn-sm" href={`/demo/${d.slug}?preview=1`} target="_blank" rel="noopener"><Icon name="eye" size={15} />معاينة (مش بتتحسب)</a>
              <a className="btn btn-ghost btn-sm" href={`/demo/${d.slug}?frame=phone&preview=1`} target="_blank" rel="noopener"><Icon name="mobile" size={15} />جوه موبايل (لمشاركة الشاشة)</a>
            </div>
          </section>

          {/* WhatsApp */}
          <section className="card p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Icon name="whatsapp" size={17} />رسالة واتساب</h2>
            <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="الرسائل الجاهزة">
              {PRESET_KEYS.map((k) => (
                <button key={k} role="tab" aria-selected={preset === k} onClick={() => setPreset(k)} className={`chip h-8 px-3 border ${preset === k ? "bg-ivory text-ink border-ivory" : "border-white/10 text-fg2 hover:text-ivory"}`}>{PRESET_LABEL[k]}</button>
              ))}
            </div>
            <textarea className="field" rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="نص الرسالة" />
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <label className="relative">
                <span className="sr-only">رقم العميل</span>
                <input className="field text-end" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} placeholder="رقم واتساب العميل" />
              </label>
              <a className="btn btn-wa" href={waHref} target="_blank" rel="noopener" onClick={markSent}><Icon name="whatsapp" size={17} />افتح في واتساب</a>
              <button className="btn btn-ghost" onClick={() => copy(msg, "الرسالة")}><Icon name="copy" size={16} />انسخ</button>
            </div>
            {!toIntl(to) && <p className="mt-2 text-[13px] text-[#ffcf70]">مفيش رقم: واتساب هيفتح وتختار الشات بنفسك.</p>}
          </section>

          {/* Call script */}
          <section className="card p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Icon name="phone" size={17} />سكريبت المكالمة</h2>
            <ol className="space-y-2.5">
              {script.map((l, i) => (
                <li key={i} className="flex gap-3 text-[15.5px] leading-relaxed">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-cobalt/20 text-[12px] text-cobalt-2 mt-0.5">{i + 1}</span>{l}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-5">
          {/* WhatsApp link preview */}
          <section className="card p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Icon name="image" size={17} />شكل اللينك في واتساب</h2>
            <p className="text-fg3 text-[13px] mb-3">ده اللي هيظهر للعميل لما تلزق اللينك (اسمهم في الصورة).</p>
            <div className="rounded-2xl bg-[#0b141a] p-3">
              <div className="ms-auto max-w-[340px] rounded-xl bg-[#005c4b] p-1.5 text-[#e9edef]">
                <div className="overflow-hidden rounded-lg bg-[#025144]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/og/${d.slug}?v=${d.updatedAt}`} alt="صورة المعاينة" className="aspect-[1200/630] w-full object-cover bg-black/20" />
                  <div className="px-2.5 py-2">
                    <p className="text-[13.5px] font-semibold leading-snug">{d.name} — نموذج موقع خاص بيكم</p>
                    <p className="text-[12px] opacity-70 line-clamp-1">{d.content.tagline}</p>
                    <p className="text-[11.5px] opacity-60" dir="ltr">{new URL(link).host}</p>
                  </div>
                </div>
                <p className="px-1.5 pt-1.5 pb-0.5 text-[13.5px] whitespace-pre-line line-clamp-3">{msg}</p>
              </div>
            </div>
            <a className="btn btn-ghost btn-sm mt-3" href={`/api/og/${d.slug}?v=${d.updatedAt}`} download={`${d.slug}-og.png`}><Icon name="download" size={15} />نزّل الصورة</a>
          </section>

          {/* Mockup */}
          <section className="card p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Icon name="mobile" size={17} />صورة موكاب تتبعت</h2>
            <p className="text-fg3 text-[13px] mb-3">ابعتها كصورة قبل اللينك، بتشد الانتباه أكتر.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/mockup/${d.slug}?w=540&v=${d.updatedAt}`} alt="موكاب الموقع على موبايل" className="w-full max-w-[300px] mx-auto rounded-2xl" loading="lazy" />
            <a className="btn btn-primary btn-sm mt-3" href={`/api/mockup/${d.slug}?download=1&v=${d.updatedAt}`}><Icon name="download" size={15} />نزّل الموكاب (PNG)</a>
          </section>

          {/* QR */}
          <section className="card p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Icon name="qr" size={17} />QR للزيارات</h2>
            <p className="text-fg3 text-[13px] mb-3">اطبعه أو وريه من موبايلك وإنت في المكان.</p>
            <div className="mx-auto w-fit rounded-2xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr ? <img src={qr} alt={`QR لينك ${d.name}`} width={200} height={200} /> : <div className="size-[200px]" />}
            </div>
            {qr && <a className="btn btn-ghost btn-sm mt-3" href={qr} download={`${d.slug}-qr.png`}><Icon name="download" size={15} />نزّل QR (PNG)</a>}
          </section>
        </div>
      </div>
    </div>
  );
}
