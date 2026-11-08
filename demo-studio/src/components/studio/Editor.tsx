"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buildContent, defaultFaq, defaultPeople, defaultServices, defaultWhy, suggestTagline } from "@/lib/demo/defaults";
import {
  CLINIC_TYPE_LABEL, CLINIC_TYPES, ContentSchema, DAYS, NICHE_LABEL, NICHES, STATUS_LABEL, STYLE_LABEL, STYLES, uid,
  type DemoContent, type Hour, type Niche, type Status, type Style,
} from "@/lib/demo/model";
import { BANKS, DEFAULT_SCHEDULE, DEFAULT_TEXT } from "@/lib/demo/niches";
import { FONT_PAIR_LABELS } from "@/lib/fontPairs";
import { PALETTES } from "@/lib/palette";
import { normalizeEgPhone } from "@/lib/phone";
import { hoursSummary, parseQuickPaste, type Parsed } from "@/lib/quickPaste";
import { slugify } from "@/lib/slug";
import type { DemoDTO } from "@/lib/dto";
import { arDate, DAY_MS } from "@/lib/expiry";
import { NicheArt } from "@/templates/Art";
import { api } from "./api";
import { Icon } from "./Icon";
import { compressImage, prepareLogo, uploadImage } from "./image";
import { ListEditor } from "./ListEditor";
import { useToast } from "./StudioShell";

const STEPS = [
  { id: "niche", label: "النوع والستايل" },
  { id: "basics", label: "البيانات" },
  { id: "content", label: "المحتوى" },
  { id: "brand", label: "الهوية" },
  { id: "photos", label: "الصور" },
  { id: "publish", label: "النشر" },
] as const;

type Meta = { id?: string; slug: string; status: Status; note: string; expiresAt: number; isSample?: boolean };

export function Editor({ initial, defaultExpiryDays }: { initial?: DemoDTO; defaultExpiryDays: number }) {
  const toast = useToast();
  const [content, setContent] = useState<DemoContent>(() => initial?.content || buildContent({ niche: "courses", style: "bold", name: "اسم البيزنس" }, "new"));
  const [nameTouched, setNameTouched] = useState(!!initial);
  const [meta, setMeta] = useState<Meta>(() => initial
    ? { id: initial.id, slug: initial.slug, status: initial.status as Status, note: initial.note, expiresAt: initial.expiresAt, isSample: !!initial.isSample }
    : { slug: "", status: "draft", note: "", expiresAt: Date.now() + defaultExpiryDays * DAY_MS });
  const [step, setStep] = useState(0);
  const [save, setSave] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const creating = useRef(false);
  const seed = meta.slug || slugify(content.nameEn || content.name) || "new";

  const update = useCallback((patch: Partial<DemoContent>) => {
    setContent((c) => ({ ...c, ...patch }));
    setSave("dirty");
  }, []);
  const brand = (patch: Partial<DemoContent["brand"]>) => update({ brand: { ...content.brand, ...patch } });

  /* ---------- Autosave (debounced) ---------- */
  useEffect(() => {
    if (save !== "dirty" || !nameTouched) return;
    const t = setTimeout(async () => {
      const parsed = ContentSchema.safeParse(content);
      if (!parsed.success) { setSave("error"); setErr(parsed.error.issues[0]?.message?.match(/[؀-ۿ]/) ? parsed.error.issues[0].message : "فيه حقل مش مظبوط"); return; }
      setSave("saving");
      try {
        if (!meta.id) {
          if (creating.current) return;
          creating.current = true;
          const r = await api<{ demo: DemoDTO }>("/api/studio/demos", { body: { content: parsed.data, status: meta.status, note: meta.note } });
          setMeta((m) => ({ ...m, id: r.demo.id, slug: r.demo.slug, expiresAt: r.demo.expiresAt }));
          window.history.replaceState(null, "", `/studio/demos/${r.demo.id}`);
          creating.current = false;
        } else {
          await api(`/api/studio/demos/${meta.id}`, { method: "PATCH", body: { content: parsed.data } });
        }
        setSave("saved");
        setErr("");
      } catch (e) {
        creating.current = false;
        setSave("error");
        setErr((e as Error).message);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [content, save, nameTouched, meta.id, meta.status, meta.note]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (save === "dirty" || save === "saving") e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [save]);

  /* ---------- Preview iframes ---------- */
  const frames = useRef<HTMLIFrameElement[]>([]);
  const post = useCallback(() => {
    frames.current.forEach((f) => f?.contentWindow?.postMessage({ type: "demo-preview", content, slug: seed }, window.location.origin));
  }, [content, seed]);
  useEffect(() => { post(); }, [post]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "demo-preview-ready") post(); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [post]);
  const scrollPreview = (id: string) => frames.current.forEach((f) => f?.contentWindow?.postMessage({ type: "demo-scroll", id }, window.location.origin));

  /* ---------- Niche switch keeps the basics, refreshes niche defaults ---------- */
  function setNiche(niche: Niche, clinicType = content.clinicType) {
    if (niche === content.niche && clinicType === content.clinicType) return;
    const b = content;
    const next = buildContent({
      niche, clinicType, style: b.style, name: b.name, nameEn: b.nameEn, phone: b.phone, whatsapp: b.whatsapp, area: b.area, address: b.address,
      mapsUrl: b.mapsUrl, hours: b.hours, instagram: b.instagram, photos: b.photos,
      brand: b.brand.logo ? b.brand : { ...b.brand, paletteId: BANKS[niche].defaultPalette, ...pal(BANKS[niche].defaultPalette) },
    }, seed);
    setContent(next);
    setSave("dirty");
  }

  const stepId = STEPS[step].id;
  const go = (i: number) => { setStep(Math.max(0, Math.min(STEPS.length - 1, i))); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      {/* ---------- Form ---------- */}
      <div className="min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-xl font-semibold truncate">{initial ? content.name : "نموذج جديد"}</h1>
          <SaveBadge state={save} err={err} />
          {meta.id && <Link href={`/studio/demos/${meta.id}/share`} className="ms-auto btn btn-primary btn-sm"><Icon name="share" size={15} />ابعت</Link>}
        </div>
        <ol className="flex gap-1.5 overflow-x-auto scrollbar-none mb-5 pb-1" aria-label="الخطوات">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined}
                className={`chip h-9 px-3.5 border transition ${i === step ? "bg-ivory text-ink border-ivory" : i < step ? "border-cobalt/40 text-ivory" : "border-white/10 text-fg2 hover:text-ivory"}`}>
                <span className={`grid size-5 place-items-center rounded-full text-[11px] ${i === step ? "bg-ink text-ivory" : "bg-white/10"}`}>{i + 1}</span>{s.label}
              </button>
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          <motion.div key={stepId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }} className="card p-5 sm:p-6 space-y-6">
            {stepId === "niche" && <StepNiche content={content} seed={seed} setNiche={setNiche} setStyle={(s) => update({ style: s })} />}
            {stepId === "basics" && <StepBasics content={content} seed={seed} update={update} setNiche={setNiche} onName={() => setNameTouched(true)} />}
            {stepId === "content" && <StepContent content={content} seed={seed} update={update} scrollPreview={scrollPreview} />}
            {stepId === "brand" && <StepBrand content={content} brand={brand} toast={toast} />}
            {stepId === "photos" && <StepPhotos content={content} update={update} toast={toast} />}
            {stepId === "publish" && <StepPublish meta={meta} setMeta={setMeta} content={content} saved={!!meta.id} toast={toast} />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex items-center gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} disabled={step === 0}><Icon name="back" size={16} />السابق</button>
          {step < STEPS.length - 1 && <button type="button" className="btn btn-primary ms-auto" onClick={() => { if (stepId === "basics") setNameTouched(true); go(step + 1); }}>التالي<Icon name="arrow" size={16} /></button>}
        </div>
      </div>

      {/* ---------- Live preview ---------- */}
      <div className={`${showPreview ? "fixed inset-0 z-50 bg-ink p-3 flex flex-col" : "hidden"} lg:static lg:z-auto lg:flex lg:flex-col lg:p-0 lg:bg-transparent`}>
        <div className="lg:sticky lg:top-20 flex flex-col gap-3 h-full lg:h-[calc(100dvh-104px)]">
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-white/10 p-1" role="group" aria-label="الجهاز">
              {(["phone", "desktop"] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} className={`chip h-8 px-3 transition ${device === d ? "bg-ivory text-ink" : "text-fg2 hover:text-ivory"}`}>
                  <Icon name={d === "phone" ? "mobile" : "desktop"} size={15} />{d === "phone" ? "موبايل" : "ديسكتوب"}
                </button>
              ))}
            </div>
            <span className="text-fg3 text-[13px] hidden xl:inline">المعاينة بتتحدّث وإنت بتكتب</span>
            {meta.id && <a href={`/demo/${meta.slug}?preview=1`} target="_blank" rel="noopener" className="ms-auto btn btn-ghost btn-sm"><Icon name="eye" size={15} />افتح</a>}
            <button type="button" className="btn btn-ghost btn-sm lg:hidden ms-auto" onClick={() => setShowPreview(false)}><Icon name="x" size={15} />قفل</button>
          </div>
          <PreviewStage device={device} frames={frames} />
        </div>
      </div>
      <button type="button" onClick={() => setShowPreview(true)} className="lg:hidden fixed bottom-5 start-5 z-40 btn btn-primary shadow-2xl"><Icon name="eye" size={16} />معاينة</button>
    </div>
  );
}

function pal(id: string) {
  const p = PALETTES.find((x) => x.id === id) || PALETTES[0];
  return { primary: p.primary, accent: p.accent };
}

function SaveBadge({ state, err }: { state: string; err: string }) {
  const map: Record<string, [string, string]> = {
    idle: ["", ""], dirty: ["هيتحفظ…", "text-fg3"], saving: ["بيتحفظ…", "text-fg2"], saved: ["اتحفظ ✓", "text-[#7ee2b0]"], error: [err || "مقدرناش نحفظ", "text-[#ff8a8f]"],
  };
  const [txt, cls] = map[state];
  return <span className={`text-[13px] ${cls}`} role="status" aria-live="polite">{txt}</span>;
}

function PreviewStage({ device, frames }: { device: "phone" | "desktop"; frames: React.RefObject<HTMLIFrameElement[]> }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 700 });
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const phone = { w: 390, h: 844 };
  const desk = { w: 1280, h: 860 };
  const ps = Math.min(1, (size.h - 8) / (phone.h + 24), (size.w - 8) / (phone.w + 24));
  const ds = Math.min(1, (size.w - 4) / desk.w, (size.h - 34) / desk.h);
  return (
    <div ref={box} className="relative flex-1 min-h-[520px] rounded-[24px] border border-white/[.06] bg-[radial-gradient(500px_300px_at_50%_30%,rgba(46,91,255,.16),transparent_70%)] overflow-hidden">
      <div className={`absolute left-1/2 top-1/2 transition-opacity ${device === "phone" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ width: phone.w + 24, height: phone.h + 24, transform: `translate(-50%,-50%) scale(${ps})` }} aria-hidden={device !== "phone"}>
        <div className="size-full rounded-[54px] bg-[#05060a] p-3 shadow-2xl ring-1 ring-white/15">
          <iframe ref={(el) => { if (el) frames.current[0] = el; }} title="معاينة موبايل" src="/studio/preview" className="size-full rounded-[44px] bg-white" />
        </div>
      </div>
      <div className={`absolute left-1/2 top-1/2 transition-opacity ${device === "desktop" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ width: desk.w, height: desk.h + 30, transform: `translate(-50%,-50%) scale(${ds})` }} aria-hidden={device !== "desktop"}>
        <div className="size-full overflow-hidden rounded-2xl bg-ink-2 shadow-2xl ring-1 ring-white/10 flex flex-col">
          <div className="h-[30px] flex items-center gap-1.5 px-3"><i className="size-2.5 rounded-full bg-white/20" /><i className="size-2.5 rounded-full bg-white/20" /><i className="size-2.5 rounded-full bg-white/20" /></div>
          <iframe ref={(el) => { if (el) frames.current[1] = el; }} title="معاينة ديسكتوب" src="/studio/preview" className="flex-1 w-full bg-white" />
        </div>
      </div>
    </div>
  );
}

/* ====================== Steps ====================== */

function StepNiche({ content, seed, setNiche, setStyle }: { content: DemoContent; seed: string; setNiche: (n: Niche, ct?: DemoContent["clinicType"]) => void; setStyle: (s: Style) => void }) {
  return (
    <>
      <fieldset>
        <legend className="font-semibold mb-3">نوع البيزنس</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {NICHES.map((n) => (
            <button key={n} type="button" onClick={() => setNiche(n)} aria-pressed={content.niche === n}
              className={`group overflow-hidden rounded-2xl border text-start transition ${content.niche === n ? "border-cobalt ring-2 ring-cobalt/40" : "border-white/10 hover:border-white/25"}`}>
              <NicheArt niche={n} seed={seed} primary={content.brand.primary} accent={content.brand.accent} className="aspect-[16/9] w-full" />
              <span className="block px-3 py-2.5 text-sm font-semibold">{NICHE_LABEL[n]}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {content.niche === "clinic" && (
        <fieldset>
          <legend className="label">نوع العيادة</legend>
          <div className="flex flex-wrap gap-2">
            {CLINIC_TYPES.map((ct) => (
              <button key={ct} type="button" aria-pressed={content.clinicType === ct} onClick={() => setNiche("clinic", ct)}
                className={`chip h-9 px-4 border ${content.clinicType === ct ? "bg-cobalt border-cobalt text-white" : "border-white/10 text-fg2 hover:text-ivory"}`}>{CLINIC_TYPE_LABEL[ct]}</button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="font-semibold mb-3">الستايل</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {STYLES.map((s) => (
            <button key={s} type="button" onClick={() => setStyle(s)} aria-pressed={content.style === s}
              className={`rounded-2xl border p-4 text-start transition ${content.style === s ? "border-cobalt ring-2 ring-cobalt/40" : "border-white/10 hover:border-white/25"}`}>
              <StyleThumb style={s} primary={content.brand.primary} accent={content.brand.accent} />
              <span className="mt-3 block font-semibold" dir="ltr">{STYLE_LABEL[s]}</span>
              <span className="block text-[13px] text-fg2">{s === "bold" ? "واجهة غامقة قوية، عناوين تقيلة، كروت جريئة" : "هادي وفاخر، مساحات واسعة، ترتيب مختلف للأقسام"}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function StyleThumb({ style, primary, accent }: { style: Style; primary: string; accent: string }) {
  if (style === "bold") {
    return (
      <svg viewBox="0 0 200 110" className="w-full rounded-xl" aria-hidden>
        <rect width="200" height="110" fill="#fff" /><rect width="200" height="62" fill="#141a33" />
        <rect x="104" y="14" width="80" height="10" rx="3" fill="#fff" /><rect x="120" y="28" width="64" height="10" rx="3" fill="#fff" />
        <rect x="140" y="44" width="44" height="10" rx="5" fill={primary} /><rect x="16" y="12" width="70" height="44" rx="8" fill={accent} transform="rotate(-3 50 34)" />
        {[0, 1, 2].map((i) => <rect key={i} x={16 + i * 60} y="72" width="52" height="30" rx="6" fill="#fff" stroke="#e5e7eb" />)}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 110" className="w-full rounded-xl" aria-hidden>
      <rect width="200" height="110" fill="#fbfaf7" /><ellipse cx="100" cy="0" rx="110" ry="50" fill={primary} opacity=".1" />
      <rect x="60" y="14" width="80" height="8" rx="3" fill="#1f2430" /><rect x="74" y="26" width="52" height="5" rx="2.5" fill="#9aa0aa" />
      <rect x="84" y="36" width="32" height="8" rx="4" fill={primary} /><rect x="24" y="52" width="152" height="50" rx="12" fill="#fff" stroke="#ececec" />
      <circle cx="100" cy="77" r="12" fill={accent} opacity=".7" />
    </svg>
  );
}

function StepBasics({ content, seed, update, setNiche, onName }: { content: DemoContent; seed: string; update: (p: Partial<DemoContent>) => void; setNiche: (n: Niche) => void; onName: () => void }) {
  const [paste, setPaste] = useState("");
  const [found, setFound] = useState<Parsed | null>(null);
  const [offset, setOffset] = useState(1);
  const sameWa = !content.whatsapp || content.whatsapp === content.phone;

  function applyPaste() {
    const p = parseQuickPaste(paste);
    setFound(p);
    const patch: Partial<DemoContent> = {};
    if (p.name) { patch.name = p.name; onName(); }
    if (p.phone) patch.phone = p.phone;
    if (p.whatsapp) patch.whatsapp = p.whatsapp;
    if (p.address) patch.address = p.address;
    if (p.area) patch.area = p.area;
    if (p.mapsUrl) patch.mapsUrl = p.mapsUrl;
    if (p.instagram) patch.instagram = p.instagram;
    if (p.hours) patch.hours = p.hours;
    update(patch);
  }
  const foundLabels = found ? ([["name", "الاسم"], ["phone", "التليفون"], ["address", "العنوان"], ["area", "المنطقة"], ["hours", "المواعيد"], ["mapsUrl", "لينك الخريطة"], ["instagram", "إنستجرام"]] as const).filter(([k]) => found[k]) : [];

  return (
    <>
      <details className="rounded-2xl border border-cobalt/30 bg-cobalt/[.06] p-4" open={!content.phone}>
        <summary className="cursor-pointer font-semibold flex items-center gap-2"><Icon name="wand" size={17} />لصق سريع: الصق أي كلام عن البيزنس</summary>
        <p className="text-fg2 text-[13px] mt-2 mb-3">من جوجل ماب أو فيسبوك أو رسالة… هنطلّع الاسم والرقم والعنوان والمواعيد لوحدنا (من غير ذكاء اصطناعي).</p>
        <textarea className="field" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"English Dose\n4.8 (120)\nمركز دروس خصوصية\nش عباس العقاد، مدينة نصر\n010 1234 5678\nالسبت - الخميس: 10 ص - 10 م"} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={applyPaste} disabled={!paste.trim()}><Icon name="sparkles" size={15} />املأ الحقول</button>
          {found && (foundLabels.length ? foundLabels.map(([k, l]) => <span key={k} className="chip bg-[#0f3324] text-[#7ee2b0]">✓ {l}</span>) : <span className="text-[13px] text-fg2">ملقيناش حاجة واضحة، املأ يدوي.</span>)}
          {found?.niche && found.niche !== content.niche && (
            <button type="button" className="chip h-7 border border-[#ffcf70]/40 text-[#ffcf70]" onClick={() => setNiche(found.niche!)}>يبان إنه {NICHE_LABEL[found.niche]} — غيّر النوع؟</button>
          )}
        </div>
      </details>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-1"><span className="label">اسم البيزنس (عربي) *</span>
          <input className="field" value={content.name} onChange={(e) => { update({ name: e.target.value }); onName(); }} onFocus={(e) => { if (e.target.value === "اسم البيزنس") e.target.select(); }} maxLength={80} />
        </label>
        <label><span className="label">الاسم بالإنجليزي (اختياري)</span>
          <input className="field" dir="ltr" value={content.nameEn} onChange={(e) => update({ nameEn: e.target.value })} placeholder="English Dose" maxLength={80} />
        </label>
        <label className="sm:col-span-2"><span className="label">جملة تعريفية قصيرة</span>
          <div className="flex gap-2">
            <input className="field" value={content.tagline} onChange={(e) => update({ tagline: e.target.value })} maxLength={140} />
            <button type="button" className="btn btn-ghost shrink-0" onClick={() => { update({ tagline: suggestTagline(content.niche, seed, { area: content.area, clinicType: content.clinicType, offset }) }); setOffset((o) => o + 1); }}><Icon name="sparkles" size={15} />اقترح</button>
          </div>
        </label>
        <label><span className="label">التليفون</span>
          <input className="field text-end" dir="ltr" inputMode="tel" value={content.phone} onChange={(e) => update({ phone: e.target.value, ...(sameWa ? { whatsapp: e.target.value } : {}) })}
            onBlur={(e) => { const n = normalizeEgPhone(e.target.value); if (n) update({ phone: n, ...(sameWa ? { whatsapp: n } : {}) }); }} placeholder="01xxxxxxxxx" />
        </label>
        <label><span className="label">واتساب {sameWa && <span className="text-fg3">(نفس التليفون)</span>}</span>
          <input className="field text-end" dir="ltr" inputMode="tel" value={content.whatsapp} onChange={(e) => update({ whatsapp: e.target.value })}
            onBlur={(e) => { const n = normalizeEgPhone(e.target.value); if (n) update({ whatsapp: n }); }} placeholder="01xxxxxxxxx" />
        </label>
        <label><span className="label">المنطقة</span><input className="field" value={content.area} onChange={(e) => update({ area: e.target.value })} placeholder="مدينة نصر" /></label>
        <label><span className="label">لينك جوجل ماب</span><input className="field" dir="ltr" value={content.mapsUrl} onChange={(e) => update({ mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" /></label>
        <label className="sm:col-span-2"><span className="label">العنوان</span><input className="field" value={content.address} onChange={(e) => update({ address: e.target.value })} placeholder="ش عباس العقاد، مدينة نصر، القاهرة" /></label>
      </div>
      <HoursPicker hours={content.hours} onChange={(hours) => update({ hours })} />
    </>
  );
}

function HoursPicker({ hours, onChange }: { hours: Hour[]; onChange: (h: Hour[]) => void }) {
  const set = (i: number, p: Partial<Hour>) => onChange(hours.map((h, k) => (k === i ? { ...h, ...p } : h)));
  const presets: [string, () => Hour[]][] = [
    ["يومياً 10ص–10م", () => hours.map(() => ({ open: true, from: "10:00", to: "22:00" }))],
    ["السبت–الخميس", () => hours.map((h, i) => ({ ...h, open: i !== 6 }))],
    ["طبّق أول يوم على الكل", () => hours.map((h) => ({ ...h, from: hours[0].from, to: hours[0].to }))],
  ];
  return (
    <fieldset>
      <legend className="font-semibold mb-1">مواعيد العمل</legend>
      <p className="text-fg3 text-[13px] mb-3">{hoursSummary(hours)}</p>
      <div className="flex flex-wrap gap-2 mb-3">{presets.map(([l, f]) => <button key={l} type="button" className="chip h-8 border border-white/10 text-fg2 hover:text-ivory" onClick={() => onChange(f())}>{l}</button>)}</div>
      <div className="grid gap-1.5">
        {DAYS.map((d, i) => (
          <div key={d} className="grid grid-cols-[92px_1fr_1fr] items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={hours[i].open} onChange={(e) => set(i, { open: e.target.checked })} className="size-4 accent-[#2E5BFF]" />{d}
            </label>
            <input type="time" aria-label={`${d} من`} className="field py-1.5" value={hours[i].from} disabled={!hours[i].open} onChange={(e) => set(i, { from: e.target.value })} />
            <input type="time" aria-label={`${d} لحد`} className="field py-1.5" value={hours[i].to} disabled={!hours[i].open} onChange={(e) => set(i, { to: e.target.value })} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function StepContent({ content, seed, update, scrollPreview }: { content: DemoContent; seed: string; update: (p: Partial<DemoContent>) => void; scrollPreview: (id: string) => void }) {
  const bank = BANKS[content.niche];
  const isShop = content.niche === "shop";
  const toast = useToast();
  return (
    <>
      <Block title={bank.itemsTitle} onFocus={() => scrollPreview("items")} onReset={() => update({ services: defaultServices(content.niche, content.clinicType) })}>
        <ListEditor items={content.services} onChange={(services) => update({ services })} titleKey="title" addLabel={isShop ? "ضيف منتج" : "ضيف خدمة / مادة"}
          blank={() => ({ title: isShop ? "منتج جديد" : "جديد", desc: "", price: "", tag: "", image: "" })}
          fields={[
            { key: "title", label: "الاسم", half: true }, { key: "tag", label: bank.tagLabel, half: true },
            { key: "price", label: "السعر (اختياري — سيبه فاضي لو مش متأكد)", placeholder: "مثلاً: 250 ج" }, { key: "desc", label: "وصف قصير", multiline: true },
          ]}
          extra={isShop ? (it, set) => <ItemImage url={it.image} onChange={(image) => set({ image })} toast={toast} /> : undefined} />
      </Block>
      {content.niche === "courses" && (
        <>
          <Block title="جدول الحصص" onFocus={() => scrollPreview("schedule")} onReset={() => update({ schedule: DEFAULT_SCHEDULE.map((s) => ({ id: uid("c"), ...s })) })}>
            <ListEditor items={content.schedule} onChange={(schedule) => update({ schedule })} titleKey="subject" addLabel="ضيف حصة"
              blank={() => ({ day: "السبت", time: "4:00 م", subject: "مادة", teacher: "" })}
              fields={[{ key: "subject", label: "المادة", half: true }, { key: "teacher", label: "المدرّس", half: true }, { key: "day", label: "اليوم", half: true }, { key: "time", label: "الساعة", half: true }]} />
          </Block>
          <label className="block"><span className="label">الأماكن المتاحة (سيبه فاضي لو مش عايزه يظهر)</span><input className="field" value={content.seats} onChange={(e) => update({ seats: e.target.value })} /></label>
        </>
      )}
      {!isShop && (
        <Block title={content.niche === "courses" ? "المدرّسين" : "الطبيب"} onFocus={() => scrollPreview("people")} onReset={() => update({ people: defaultPeople(content.niche, content.clinicType) })}>
          <ListEditor items={content.people} onChange={(people) => update({ people })} titleKey="name" addLabel={content.niche === "courses" ? "ضيف مدرّس" : "ضيف طبيب"} max={12}
            blank={() => ({ name: content.niche === "courses" ? "أ. " : "د. ", role: "", bio: "" })}
            fields={[{ key: "name", label: "الاسم", half: true }, { key: "role", label: bank.peopleRoleHint, half: true }, { key: "bio", label: "نبذة قصيرة", multiline: true }]} />
        </Block>
      )}
      <Block title="ليه تختارنا" onFocus={() => scrollPreview("why")} onReset={() => update({ why: defaultWhy(content.niche, seed + Math.random(), content.clinicType) })} resetLabel="نسخة تانية">
        <ListEditor items={content.why} onChange={(why) => update({ why })} titleKey="t" addLabel="ضيف نقطة" max={6}
          blank={() => ({ t: "نقطة جديدة", d: "" })} fields={[{ key: "t", label: "العنوان" }, { key: "d", label: "الشرح", multiline: true }]} />
      </Block>
      <Block title="أسئلة شائعة" onFocus={() => scrollPreview("faq")} onReset={() => update({ faq: defaultFaq(content.niche, seed + Math.random()) })} resetLabel="أسئلة تانية">
        <ListEditor items={content.faq} onChange={(faq) => update({ faq })} titleKey="q" addLabel="ضيف سؤال" max={16}
          blank={() => ({ q: "سؤال جديد؟", a: "" })} fields={[{ key: "q", label: "السؤال" }, { key: "a", label: "الإجابة", multiline: true }]} />
      </Block>
      {content.niche === "clinic" && <label className="block"><span className="label">التأمين / ملاحظات</span><textarea className="field" rows={2} value={content.insurance} onChange={(e) => update({ insurance: e.target.value })} placeholder={DEFAULT_TEXT.insurance} /></label>}
      {isShop && (
        <>
          <label className="block"><span className="label">مناطق التوصيل</span><textarea className="field" rows={2} value={content.delivery} onChange={(e) => update({ delivery: e.target.value })} /></label>
          <label className="block"><span className="label">سياسة الاسترجاع</span><textarea className="field" rows={2} value={content.returns} onChange={(e) => update({ returns: e.target.value })} /></label>
          <label className="block"><span className="label">إنستجرام</span><input className="field" dir="ltr" value={content.instagram} onChange={(e) => update({ instagram: e.target.value })} placeholder="https://instagram.com/…" /></label>
        </>
      )}
      <label className="block"><span className="label">نبذة تحت العنوان (اختياري — لو فاضي هنكتبها من بنك الجمل)</span><textarea className="field" rows={2} value={content.intro} onChange={(e) => update({ intro: e.target.value })} /></label>
    </>
  );
}

function Block({ title, children, onReset, onFocus, resetLabel = "رجّع الافتراضي" }: { title: string; children: React.ReactNode; onReset?: () => void; onFocus?: () => void; resetLabel?: string }) {
  return (
    <section onFocusCapture={onFocus} onMouseEnter={onFocus}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        {onReset && <button type="button" className="text-[13px] text-fg2 hover:text-ivory" onClick={onReset}>{resetLabel}</button>}
      </div>
      {children}
    </section>
  );
}

type ToastFn = ReturnType<typeof useToast>;

function ItemImage({ url, onChange, toast }: { url: string; onChange: (u: string) => void; toast: ToastFn }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {url ? <img src={url} alt="" className="size-14 rounded-xl object-cover" /> : <span className="grid size-14 place-items-center rounded-xl bg-white/5 text-fg3"><Icon name="image" /></span>}
      <label className="btn btn-ghost btn-sm cursor-pointer">
        <Icon name="upload" size={15} />{busy ? "بيترفع…" : url ? "غيّر الصورة" : "صورة المنتج"}
        <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return; setBusy(true);
          try { onChange(await uploadImage(await compressImage(f), "photo")); } catch (er) { toast({ text: (er as Error).message, tone: "err" }); }
          setBusy(false); e.target.value = "";
        }} />
      </label>
      {url && <button type="button" className="text-[13px] text-[#ff8a8f]" onClick={() => onChange("")}>شيل</button>}
    </div>
  );
}

function StepBrand({ content, brand, toast }: { content: DemoContent; brand: (p: Partial<DemoContent["brand"]>) => void; toast: ToastFn }) {
  const [busy, setBusy] = useState(false);
  const [extracted, setExtracted] = useState<string[]>([]);
  const b = content.brand;
  async function onLogo(f: File) {
    if (f.size > 5 * 1024 * 1024) { toast({ text: "اللوجو أكبر من 5 ميجا", tone: "err" }); return; }
    setBusy(true);
    try {
      const { blob, palette, colors } = await prepareLogo(f);
      setExtracted(colors);
      const url = await uploadImage(blob, "logo");
      brand({ logo: url, ...(palette ? { ...palette, paletteId: "logo" } : {}) });
      toast({ text: palette ? "اتظبطت الألوان من اللوجو ✨" : "اترفع اللوجو", tone: "ok" });
    } catch (e) { toast({ text: (e as Error).message, tone: "err" }); }
    setBusy(false);
  }
  return (
    <>
      <section>
        <h3 className="font-semibold mb-2">اللوجو</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-24 place-items-center overflow-hidden rounded-2xl bg-white">
            {b.logo ? <img src={b.logo} alt="اللوجو" className="max-h-full max-w-full object-contain p-2" /> : <Icon name="image" size={28} className="text-[#9aa0aa]" />}
          </div>
          <div className="space-y-2">
            <label className="btn btn-ghost cursor-pointer"><Icon name="upload" size={16} />{busy ? "بيترفع…" : b.logo ? "غيّر اللوجو" : "ارفع لوجو"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); e.target.value = ""; }} />
            </label>
            {b.logo && <button type="button" className="block text-[13px] text-[#ff8a8f]" onClick={() => brand({ logo: "" })}>شيل اللوجو</button>}
            <p className="text-[12.5px] text-fg3">بيتقصّ أوتوماتيك وبنطلّع ألوانه.</p>
          </div>
          {extracted.length > 0 && (
            <div className="flex gap-1.5" aria-label="ألوان اللوجو">
              {extracted.map((c, i) => <button key={c} type="button" title={c} onClick={() => brand(i === 0 ? { primary: c } : { accent: c })} className="size-8 rounded-full ring-2 ring-white/10 hover:ring-white/40" style={{ background: c }} />)}
            </div>
          )}
        </div>
      </section>
      <section>
        <h3 className="font-semibold mb-2">الألوان</h3>
        <div className="grid grid-cols-4 gap-2">
          {PALETTES.map((p) => (
            <button key={p.id} type="button" onClick={() => brand({ paletteId: p.id, primary: p.primary, accent: p.accent })} aria-pressed={b.paletteId === p.id}
              className={`rounded-xl border p-2 text-start transition ${b.paletteId === p.id ? "border-cobalt ring-2 ring-cobalt/40" : "border-white/10 hover:border-white/25"}`}>
              <span className="flex h-8 overflow-hidden rounded-lg"><span className="flex-[2]" style={{ background: p.primary }} /><span className="flex-1" style={{ background: p.accent }} /></span>
              <span className="mt-1.5 block text-[12.5px] text-fg2">{p.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="color" value={b.primary} onChange={(e) => brand({ primary: e.target.value.toUpperCase(), paletteId: "custom" })} className="size-9 rounded-lg bg-transparent" />اللون الأساسي</label>
          <label className="flex items-center gap-2 text-sm"><input type="color" value={b.accent} onChange={(e) => brand({ accent: e.target.value.toUpperCase(), paletteId: "custom" })} className="size-9 rounded-lg bg-transparent" />لون مساعد</label>
        </div>
      </section>
      <section>
        <h3 className="font-semibold mb-2">الخط</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(FONT_PAIR_LABELS) as (keyof typeof FONT_PAIR_LABELS)[]).map((f) => (
            <button key={f} type="button" onClick={() => brand({ font: f })} aria-pressed={b.font === f}
              className={`rounded-xl border px-4 py-3 text-start transition ${b.font === f ? "border-cobalt ring-2 ring-cobalt/40" : "border-white/10 hover:border-white/25"}`}>
              <span className="block text-lg font-bold" style={{ fontFamily: fontVar(f, "h") }}>{content.name || "اسم البيزنس"}</span>
              <span className="block text-[12.5px] text-fg2" style={{ fontFamily: fontVar(f, "b") }}>{FONT_PAIR_LABELS[f]}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3 className="font-semibold mb-2">الوضع</h3>
        <div className="flex gap-2">
          {(["light", "dark"] as const).map((m) => <button key={m} type="button" aria-pressed={b.mode === m} onClick={() => brand({ mode: m })} className={`chip h-10 px-5 border ${b.mode === m ? "bg-ivory text-ink border-ivory" : "border-white/10 text-fg2"}`}>{m === "light" ? "☀️ فاتح" : "🌙 غامق"}</button>)}
        </div>
      </section>
    </>
  );
}

function fontVar(f: keyof typeof FONT_PAIR_LABELS, k: "h" | "b") {
  const m = { "cairo-tajawal": ["--f-cairo", "--f-tajawal"], "readex-plex": ["--f-readex", "--f-plex"], plex: ["--f-plex", "--f-plex"], "tajawal-cairo": ["--f-tajawal", "--f-cairo"] }[f];
  return `var(${k === "h" ? m[0] : m[1]})`;
}

function StepPhotos({ content, update, toast }: { content: DemoContent; update: (p: Partial<DemoContent>) => void; toast: ToastFn }) {
  const [busy, setBusy] = useState(0);
  async function add(files: FileList) {
    const room = 8 - content.photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast({ text: "أقصى حاجة 8 صور", tone: "err" });
    setBusy(list.length);
    const urls: string[] = [];
    for (const f of list) {
      try { urls.push(await uploadImage(await compressImage(f), "photo")); } catch (e) { toast({ text: (e as Error).message, tone: "err" }); }
      setBusy((b) => b - 1);
    }
    update({ photos: [...content.photos, ...urls].slice(0, 8) });
  }
  const move = (i: number, d: number) => {
    const p = content.photos.slice(); const j = i + d; if (j < 0 || j >= p.length) return;
    [p[i], p[j]] = [p[j], p[i]]; update({ photos: p });
  };
  return (
    <>
      <div>
        <h3 className="font-semibold">صور البيزنس (لحد 8)</h3>
        <p className="text-fg2 text-[13px] mt-1">بتتضغط على جهازك لـ WebP أقل من 300KB. أول صورة بتظهر في الواجهة. لو مفيش صور، هنستخدم رسومات تجريدية معمولة بالكود — من غير صور ستوك أو وشوش.</p>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {content.photos.map((p, i) => (
          <li key={p} className="group relative aspect-square overflow-hidden rounded-xl bg-white/5">
            <img src={p} alt={`صورة ${i + 1}`} className="size-full object-cover" />
            {i === 0 && <span className="absolute top-1.5 start-1.5 chip bg-black/70 text-white h-6">الواجهة</span>}
            <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
              <button type="button" className="btn btn-sm bg-black/70 text-white px-2" onClick={() => move(i, -1)} aria-label="قدّم"><Icon name="back" size={14} /></button>
              <button type="button" className="btn btn-sm bg-black/70 text-white px-2" onClick={() => move(i, 1)} aria-label="أخّر"><Icon name="arrow" size={14} /></button>
              <button type="button" className="btn btn-sm bg-black/70 text-[#ff8a8f] px-2 ms-auto" onClick={() => update({ photos: content.photos.filter((x) => x !== p) })} aria-label="امسح"><Icon name="trash" size={14} /></button>
            </div>
          </li>
        ))}
        {content.photos.length < 8 && (
          <li>
            <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-white/15 text-fg2 hover:border-white/30 hover:text-ivory transition text-center text-sm">
              <span><Icon name="upload" className="mx-auto mb-1" />{busy ? `بيترفع… (${busy})` : "ضيف صور"}</span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files?.length) add(e.target.files); e.target.value = ""; }} />
            </label>
          </li>
        )}
      </ul>
    </>
  );
}

function StepPublish({ meta, setMeta, content, saved, toast }: { meta: Meta; setMeta: React.Dispatch<React.SetStateAction<Meta>>; content: DemoContent; saved: boolean; toast: ToastFn }) {
  const [slug, setSlug] = useState(meta.slug || slugify(content.nameEn || content.name));
  const [days, setDays] = useState(14);
  const [note, setNote] = useState(meta.note);
  const [busy, setBusy] = useState(false);
  const isDraft = meta.status === "draft" || meta.status === "request";
  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  async function publish(publishNow: boolean) {
    if (!meta.id) { toast({ text: "اكتب اسم البيزنس الأول عشان يتحفظ", tone: "err" }); return; }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { slug, note, expiresAt: Date.now() + days * DAY_MS };
      if (publishNow && isDraft) body.status = "sent";
      const r = await api<{ demo: DemoDTO }>(`/api/studio/demos/${meta.id}`, { method: "PATCH", body });
      setMeta((m) => ({ ...m, slug: r.demo.slug, status: r.demo.status as Status, note: r.demo.note, expiresAt: r.demo.expiresAt }));
      toast({ text: publishNow ? "النموذج جاهز للإرسال 🚀" : "اتحفظ", tone: "ok" });
      if (publishNow) window.location.href = `/studio/demos/${meta.id}/share`;
    } catch (e) { toast({ text: (e as Error).message, tone: "err" }); }
    setBusy(false);
  }

  return (
    <>
      <label className="block"><span className="label">الرابط</span>
        <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 focus-within:border-cobalt" dir="ltr">
          <span className="grid place-items-center bg-white/[.04] px-3 text-[13px] text-fg3 whitespace-nowrap">/demo/</span>
          <input className="flex-1 bg-transparent px-3 py-2.5 outline-none" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 60))} />
          <button type="button" className="px-3 text-[13px] text-fg2 hover:text-ivory" onClick={() => setSlug(slugify(content.nameEn || content.name))}>تلقائي</button>
        </div>
        <span className="mt-1 block text-[12.5px] text-fg3" dir="ltr">{origin}/demo/{slug}</span>
      </label>
      <label className="block"><span className="label">مدة النموذج</span>
        <select className="field" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[3, 7, 14, 30, 60].map((d) => <option key={d} value={d}>{d} يوم — لحد {arDate(Date.now() + d * DAY_MS)}</option>)}
        </select>
      </label>
      <label className="block"><span className="label">ملاحظة ليك (مش بتظهر للعميل)</span><textarea className="field" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="كلّمت السكرتيرة، صاحب السنتر بيرجع بعد 6…" /></label>
      <p className="text-[13px] text-fg2">الحالة الحالية: <b className="text-ivory">{STATUS_LABEL[meta.status]}</b>{isDraft && " — المسودات مش بتفتح للعامة لحد ما تنشر."}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={busy || !saved} onClick={() => publish(true)}><Icon name="rocket" size={16} />{isDraft ? "انشر وجهّز للإرسال" : "احفظ وروح للإرسال"}</button>
        <button type="button" className="btn btn-ghost" disabled={busy || !saved} onClick={() => publish(false)}>احفظ بس</button>
      </div>
    </>
  );
}
