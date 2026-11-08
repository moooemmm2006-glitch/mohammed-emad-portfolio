/** Desktop view of a demo inside a phone (for screen-sharing): `?frame=phone`. */
export function PhoneFrame({ src, name }: { src: string; name: string }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#0B0D12] p-6">
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(700px 420px at 50% 40%, rgba(46,91,255,.25), transparent 70%)" }} />
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative h-[min(844px,calc(100dvh-110px))] aspect-[390/844] rounded-[56px] border border-white/15 bg-[#05060a] p-[12px] shadow-[0_60px_120px_-40px_rgba(0,0,0,.8),inset_0_0_0_2px_#1c212c]">
          <div aria-hidden className="absolute left-1/2 top-[22px] z-10 h-[26px] w-[110px] -translate-x-1/2 rounded-full bg-black" />
          <iframe title={`نموذج ${name}`} src={src} className="size-full rounded-[44px] bg-white" />
        </div>
        <p className="text-[14px] text-[#A2A5AD]">{name} · عرض الموبايل</p>
      </div>
    </main>
  );
}
