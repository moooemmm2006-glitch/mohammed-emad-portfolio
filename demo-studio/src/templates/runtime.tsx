"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import type { RenderMode } from "@/lib/demo/model";
import { waLink } from "@/lib/phone";

/**
 * Client runtime shared by every interactive part of a template: the demo-mode modal,
 * engagement tracking hooks, and real actions on a live site.
 */
export type Act =
  | { kind: "whatsapp"; text: string; label?: string }
  | { kind: "call"; label?: string }
  | { kind: "form"; fields: Record<string, string>; label?: string };

type Runtime = {
  mode: RenderMode;
  slug: string;
  name: string;
  phone: string;
  whatsapp: string;
  ownerWhatsapp: string;
  act: (a: Act) => void;
  track: (type: string, label?: string) => void;
};

const Ctx = createContext<Runtime | null>(null);
export function useRuntime(): Runtime {
  const r = useContext(Ctx);
  if (!r) throw new Error("Template runtime missing");
  return r;
}

declare global {
  interface Window { __demoTrack?: (type: string, label?: string) => void }
}

export function TemplateRuntime({ mode, slug, name, phone, whatsapp, ownerWhatsapp, children }: {
  mode: RenderMode; slug: string; name: string; phone: string; whatsapp: string; ownerWhatsapp: string; children: React.ReactNode;
}) {
  const [modal, setModal] = useState<null | { title: string; body: string }>(null);
  const track = useCallback((type: string, label?: string) => { window.__demoTrack?.(type, label); }, []);

  const act = useCallback((a: Act) => {
    const wa = whatsapp || phone;
    if (mode === "site" || mode === "export") {
      if (a.kind === "call") { track("cta_call", a.label); window.location.href = `tel:${phone || wa}`; return; }
      if (a.kind === "whatsapp") { track("cta_whatsapp", a.label); window.open(waLink(wa, a.text), "_blank", "noopener"); return; }
      // Real form: store + webhook (server), then hand over to WhatsApp with the details.
      track("form_submit", a.label);
      const lines = Object.entries(a.fields).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
      if (mode === "site") {
        fetch("/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, fields: a.fields }) }).catch(() => {});
      }
      window.open(waLink(wa, `أهلاً ${name} 👋\n${a.label || "حجز جديد"}\n${lines}`), "_blank", "noopener");
      return;
    }
    // Demo / preview: nothing reaches the business; explain what the real site does.
    if (a.kind === "form") {
      track("form_submit", a.label);
      setModal({ title: "تمام كده 👌", body: "كده الحجوزات هتوصلك على واتساب أو في شيت تلقائياً 👌 — ده اللي هيحصل في موقعك الحقيقي" });
    } else if (a.kind === "call") {
      track("cta_call", a.label);
      setModal({ title: "زر الاتصال 📞", body: `في موقعك الحقيقي الزرار ده بيتصل بيكم على طول${phone ? ` على ${phone}` : ""}، من غير ما العميل يدوّر على الرقم.` });
    } else {
      track("cta_whatsapp", a.label);
      setModal({ title: "رسالة جاهزة على واتساب 💬", body: `في موقعك الحقيقي الزرار ده بيفتح واتساب على رقمكم برسالة جاهزة:\n«${a.text}»` });
    }
  }, [mode, phone, whatsapp, name, slug, track]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const ownerMsg = `أهلاً محمد، شفت النموذج بتاع ${name} وعايز أكمّل 👋`;

  return (
    <MotionConfig reducedMotion="user">
      <Ctx.Provider value={{ mode, slug, name, phone, whatsapp, ownerWhatsapp, act, track }}>
        {children}
        <AnimatePresence>
          {modal && (
            <motion.div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button aria-label="إغلاق" className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default" onClick={() => setModal(null)} />
              <motion.div role="dialog" aria-modal="true" aria-labelledby="demo-modal-title" initial={{ y: 30, opacity: 0, scale: .98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 320 }}
                className="relative w-full max-w-md rounded-3xl bg-card text-fg p-6 shadow-2xl border border-line">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-p-soft text-p text-2xl" aria-hidden>✨</div>
                <h2 id="demo-modal-title" className="text-xl font-bold text-center mb-2">{modal.title}</h2>
                <p className="text-center text-mute whitespace-pre-line mb-5">{modal.body}</p>
                {mode !== "preview" && (
                  <a href={waLink(ownerWhatsapp, ownerMsg)} target="_blank" rel="noopener" onClick={() => track("cta_contact", "modal")}
                    className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#1FAF5A] text-white font-bold hover:brightness-110 transition">
                    <WaGlyph /> عايز الموقع ده؟ كلّم محمد
                  </a>
                )}
                <button autoFocus onClick={() => setModal(null)} className="mt-2 w-full h-11 rounded-2xl text-mute hover:text-fg hover:bg-bg2 transition">تمام، كمّل تصفّح</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Ctx.Provider>
    </MotionConfig>
  );
}

export function WaGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3.6 20.4 1.2-4.1a8.6 8.6 0 1 1 3.1 3z" />
      <path d="M9.3 8.2c.3 0 .5.2.6.5l.6 1.4-.8 1c.5 1 1.3 1.8 2.3 2.3l1-.8 1.4.6c.3.1.5.3.5.6 0 .9-.9 1.6-1.9 1.5-2.6-.3-5-2.7-5.3-5.3-.1-1 .6-1.8 1.6-1.8z" />
    </svg>
  );
}
