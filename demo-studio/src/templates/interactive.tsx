"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRuntime, WaGlyph, type Act } from "./runtime";

/** A button that runs a template action (WhatsApp / call / form) through the runtime. */
export function ActionButton({ action, className, children, ariaLabel }: { action: Act; className?: string; children: React.ReactNode; ariaLabel?: string }) {
  const { act } = useRuntime();
  return (
    <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => act(action)} className={className} aria-label={ariaLabel}>
      {children}
    </motion.button>
  );
}

export type FieldDef = { name: string; label: string; type?: "text" | "tel" | "select"; options?: string[]; placeholder?: string; required?: boolean; autoComplete?: string };

/** Booking / registration form. Demo mode: friendly modal + engagement event. Live site: stored + WhatsApp. */
export function BookingForm({ fields, submitLabel, formLabel, variant = "card" }: { fields: FieldDef[]; submitLabel: string; formLabel: string; variant?: "card" | "plain" }) {
  const { act } = useRuntime();
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    for (const f of fields) values[f.label] = String(fd.get(f.name) || "").trim().slice(0, 200);
    const phoneField = fields.find((f) => f.type === "tel");
    if (phoneField) {
      const v = values[phoneField.label].replace(/[^\d+]/g, "");
      if (v && !/^(\+?20|0)?1[0125]\d{8}$/.test(v)) { setErr("اكتب رقم موبايل مصري صحيح (11 رقم يبدأ بـ 01)"); return; }
    }
    setErr("");
    act({ kind: "form", fields: values, label: formLabel });
    setDone(true);
  }
  return (
    <form onSubmit={onSubmit} className={variant === "card" ? "rounded-[28px] bg-card border border-line p-5 sm:p-7 shadow-[0_30px_80px_-40px_rgba(0,0,0,.35)]" : ""} noValidate>
      <div className="grid gap-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label htmlFor={`f-${f.name}`} className="block text-sm font-semibold mb-1.5">{f.label}{f.required && <span className="text-p" aria-hidden> *</span>}</label>
            {f.type === "select" ? (
              <select id={`f-${f.name}`} name={f.name} className="tpl-input" required={f.required} defaultValue="">
                <option value="" disabled>اختار…</option>
                {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input id={`f-${f.name}`} name={f.name} type={f.type || "text"} inputMode={f.type === "tel" ? "tel" : undefined} dir={f.type === "tel" ? "ltr" : undefined}
                className={`tpl-input ${f.type === "tel" ? "text-end" : ""}`} placeholder={f.placeholder} required={f.required} autoComplete={f.autoComplete} maxLength={120} />
            )}
          </div>
        ))}
      </div>
      {err && <p role="alert" className="mt-3 text-sm font-medium text-[#c0362c]">{err}</p>}
      <button type="submit" className="tp-btn mt-5 w-full h-13 min-h-[52px] rounded-2xl font-bold text-[17px] flex items-center justify-center gap-2 transition hover:-translate-y-0.5 active:translate-y-0">
        <WaGlyph /> {done ? "اتبعت ✓ — ابعت تاني" : submitLabel}
      </button>
      <p className="mt-3 text-center text-[13px] text-mute">بياناتك بتوصلنا إحنا بس، ومش بنشاركها مع حد.</p>
    </form>
  );
}

/** Click-to-load map: no Google scripts or cookies until the visitor asks for the map. */
export function MapFacade({ query, label, className = "" }: { query: string; label: string; className?: string }) {
  const [on, setOn] = useState(false);
  const { track } = useRuntime();
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=ar`;
  if (on) return <iframe title={`خريطة ${label}`} src={src} className={`w-full border-0 ${className}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />;
  return (
    <button type="button" onClick={() => { setOn(true); track("map_open"); }} className={`group relative w-full overflow-hidden bg-bg2 ${className}`} aria-label={`اعرض الخريطة: ${label}`}>
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <rect width="400" height="240" fill="var(--bg2)" />
        {[30, 90, 150, 210].map((y) => <path key={y} d={`M0 ${y} C 120 ${y - 18}, 260 ${y + 22}, 400 ${y - 6}`} stroke="var(--line)" strokeWidth="10" fill="none" />)}
        {[60, 170, 300].map((x) => <path key={x} d={`M${x} 0 L ${x + 30} 240`} stroke="var(--line)" strokeWidth="7" fill="none" />)}
        <path d="M0 160 C 100 140, 180 200, 400 150" stroke="var(--p-soft)" strokeWidth="18" fill="none" />
      </svg>
      <span className="relative mx-auto grid place-items-center gap-2 py-10">
        <span className="grid size-14 place-items-center rounded-full tp-btn shadow-lg transition group-hover:scale-105">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
        </span>
        <span className="rounded-full bg-card/90 px-4 py-1.5 text-sm font-semibold shadow">اعرض الخريطة</span>
      </span>
    </button>
  );
}

/** Product grid with category filter; each product orders on WhatsApp with its name prefilled. */
export function ProductFilter({ categories, children }: { categories: string[]; children: React.ReactNode }) {
  const [cat, setCat] = useState("");
  return (
    <div data-cat={cat}>
      {categories.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="الأقسام">
          {["", ...categories].map((c) => (
            <button key={c || "all"} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}
              className={`h-10 shrink-0 rounded-full px-5 text-[15px] font-semibold border transition ${cat === c ? "tp-btn border-transparent" : "border-line hover:border-p text-fg"}`}>
              {c || "الكل"}
            </button>
          ))}
        </div>
      )}
      <style>{cat ? `[data-cat="${CSS.escape(cat)}"] [data-product]:not([data-product="${CSS.escape(cat)}"]){display:none}` : ""}</style>
      {children}
    </div>
  );
}
