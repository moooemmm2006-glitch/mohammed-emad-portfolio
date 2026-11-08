"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { waLink } from "@/lib/phone";
import { WaGlyph } from "@/templates/runtime";

/** Slim, dismissible bar on top of a demo (in the page flow, so it never covers content). */
export function DemoBar({ name, ownerName, ownerWhatsapp, portfolioUrl, until }: { name: string; ownerName: string; ownerWhatsapp: string; portfolioUrl: string; until: string }) {
  const [open, setOpen] = useState(true);
  const track = (type: string, label?: string) => window.__demoTrack?.(type, label);
  const msg = `أهلاً محمد، شفت النموذج بتاع ${name} وعايز أكمّل 👋`;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={false} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden" data-demo-bar>
          <div className="relative bg-[#0B0D12] text-[#F4F1EA] font-[family-name:var(--font-ui)]">
            <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: "linear-gradient(90deg, rgba(46,91,255,.35), transparent 40%, rgba(245,184,65,.18))" }} />
            <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 pe-11 text-[14px] sm:px-8">
              <p className="min-w-0 flex-1 basis-[240px] leading-snug">
                <span aria-hidden>✨ </span>ده نموذج مجاني اتعمل مخصوص لـ <b>{name}</b> من {ownerName}
                <span className="ms-2 whitespace-nowrap text-[12.5px] text-[#A2A5AD]">· النموذج متاح لحد {until}</span>
              </p>
              <div className="flex items-center gap-2">
                <a href={waLink(ownerWhatsapp, msg)} target="_blank" rel="noopener" onClick={() => track("cta_contact", "bar")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1FAF5A] px-4 text-[13.5px] font-bold text-white transition hover:brightness-110">
                  <WaGlyph size={16} /> عايز الموقع ده؟ كلّمني
                </a>
                <a href={portfolioUrl} target="_blank" rel="noopener" onClick={() => track("cta_portfolio", "bar")}
                  className="inline-flex h-9 items-center rounded-full border border-white/20 px-4 text-[13.5px] font-semibold transition hover:bg-white/10">
                  شوف شغلي
                </a>
              </div>
              <button onClick={() => { setOpen(false); track("bar_dismiss"); }} aria-label="إخفاء الشريط"
                className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[#A2A5AD] transition hover:bg-white/10 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Thin owner strip above the mobile sticky bar (demo mode only). */
export function OwnerStrip({ name, ownerWhatsapp }: { name: string; ownerWhatsapp: string }) {
  const msg = `أهلاً محمد، شفت النموذج بتاع ${name} وعايز أكمّل 👋`;
  return (
    <a href={waLink(ownerWhatsapp, msg)} target="_blank" rel="noopener" onClick={() => window.__demoTrack?.("cta_contact", "sticky")}
      className="mb-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#0B0D12] py-1.5 text-[13px] font-semibold text-[#F4F1EA] font-[family-name:var(--font-ui)]">
      ✨ نموذج مجاني من محمد عماد · <span className="text-[#7ee2b0]">عايز الموقع ده؟ كلّمني</span>
    </a>
  );
}
