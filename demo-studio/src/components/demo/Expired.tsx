import { waLink } from "@/lib/phone";

export function Expired({ name, ownerWhatsapp, portfolioUrl }: { name: string; ownerWhatsapp: string; portfolioUrl: string }) {
  const msg = `أهلاً محمد، كنت شفت النموذج بتاع ${name} وحابب نكمّل 👋`;
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#0B0D12] px-5 text-[#F4F1EA]">
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(600px 360px at 50% 30%, rgba(46,91,255,.28), transparent 70%), radial-gradient(400px 260px at 70% 80%, rgba(245,184,65,.14), transparent 70%)" }} />
      <div className="relative max-w-lg text-center">
        <div className="mx-auto mb-8 grid size-20 place-items-center rounded-3xl border border-white/10 bg-white/[.04] text-4xl" aria-hidden>⏳</div>
        <h1 className="text-[30px] sm:text-[40px] font-semibold leading-tight">النموذج ده خلص… بس لسه ممكن نعمله لك 😊</h1>
        <p className="mt-4 text-[17px] text-[#A2A5AD]">النموذج اللي اتعمل لـ <b className="text-[#F4F1EA]">{name}</b> انتهت مدته. ابعتلي وأرجّعه لك في دقايق، أو نبدأ على طول في الموقع الحقيقي.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={waLink(ownerWhatsapp, msg)} target="_blank" rel="noopener" className="inline-flex h-13 min-h-[52px] items-center gap-2 rounded-full bg-[#1FAF5A] px-7 font-bold text-white transition hover:brightness-110">كلّمني على واتساب</a>
          <a href={portfolioUrl} className="inline-flex h-13 min-h-[52px] items-center rounded-full border border-white/15 px-7 font-semibold transition hover:bg-white/5">شوف شغلي</a>
        </div>
        <p className="mt-10 text-[13px] text-[#8A8E98]">ME Web · محمد عماد</p>
      </div>
    </main>
  );
}
