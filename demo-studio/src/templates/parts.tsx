import Image from "next/image";
import type { DemoContent, RenderMode, Style } from "@/lib/demo/model";
import { phrases } from "@/lib/demo/defaults";
import { displayPhone } from "@/lib/phone";

/** Everything a section needs, computed once per render. */
export type T = {
  c: DemoContent;
  seed: string;
  mode: RenderMode;
  style: Style;
  ph: ReturnType<typeof phrases>;
  phone: string;
  wa: string;
  dark: boolean;
  ownerWa: string;
};

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Section({ id, label, children, className = "", t }: { id: string; label: string; children: React.ReactNode; className?: string; t: T }) {
  const pad = t.style === "calm" ? "py-20 sm:py-28" : "py-16 sm:py-24";
  return (
    <section id={id} data-section={id} data-label={label} aria-label={label} className={`${pad} ${className}`}>
      {children}
    </section>
  );
}

export function Head({ t, kicker, title, lead, center }: { t: T; kicker?: string; title: string; lead?: string; center?: boolean }) {
  if (t.style === "calm") {
    return (
      <header className={`mb-10 sm:mb-14 ${center === false ? "" : "text-center mx-auto"} max-w-2xl`}>
        {kicker && <p className="inline-flex items-center gap-2 rounded-full bg-p-soft px-3.5 py-1 text-[13px] font-semibold text-p mb-4">{kicker}</p>}
        <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-tight text-fg">{title}</h2>
        {lead && <p className="mt-3 text-[17px] text-mute">{lead}</p>}
      </header>
    );
  }
  return (
    <header className={`mb-9 sm:mb-12 max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {kicker && (
        <p className={`flex items-center gap-3 text-[14px] font-bold text-p mb-3 ${center ? "justify-center" : ""}`}>
          <span className="h-[3px] w-8 rounded-full bg-a" aria-hidden />{kicker}
        </p>
      )}
      <h2 className="text-[32px] sm:text-[46px] font-extrabold leading-[1.15] tracking-tight">{title}</h2>
      {lead && <p className="mt-3 text-[17px] text-mute max-w-2xl">{lead}</p>}
    </header>
  );
}

/** Visibly labelled sample content (honesty rule). */
export function SampleBadge({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`inline-flex items-center gap-2 rounded-full border border-dashed border-a bg-a-soft px-3 py-1 text-[13px] font-semibold text-fg ${className}`}>
      <span aria-hidden>🏷️</span>{text}
    </p>
  );
}

export function Img({ src, alt, mode, className = "", sizes = "100vw", priority = false }: { src: string; alt: string; mode: RenderMode; className?: string; sizes?: string; priority?: boolean }) {
  // Exported static sites and the editor preview use the plain file; live pages go through next/image.
  if (mode === "export" || mode === "preview") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`absolute inset-0 size-full object-cover ${className}`} loading={priority ? "eager" : "lazy"} decoding="async" />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} className={`object-cover ${className}`} priority={priority} />;
}

export function Monogram({ t, size = 44 }: { t: T; size?: number }) {
  const { c } = t;
  if (c.brand.logo) {
    return (
      <span className="relative block shrink-0 overflow-hidden rounded-xl bg-white" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.brand.logo} alt={`شعار ${c.name}`} className="absolute inset-0 size-full object-contain p-1" />
      </span>
    );
  }
  const core = c.name.replace(/^(سنتر|مركز|أكاديمية|اكاديمية|عيادة|عيادات|متجر|محل|د\.|دكتور)\s+/, "").trim();
  const letter = (core.replace(/^ال(?=[\u0621-\u064A]{2})/, "")[0] || c.name[0] || "•");
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-xl tp-btn font-extrabold" style={{ width: size, height: size, fontSize: size * 0.5, fontFamily: "var(--font-h)" }}>
      {letter}
    </span>
  );
}

export function Initials({ name, className = "" }: { name: string; className?: string }) {
  // Placeholder names ("(اسم المدرّس)") get a neutral silhouette-free mark, never a face.
  if (/[()]/.test(name)) {
    return (
      <span aria-hidden className={`grid place-items-center ${className}`}>
        <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></svg>
      </span>
    );
  }
  const clean = name.replace(/^(أ\.|ا\.|د\.|م\.|مستر|ميس|دكتور|دكتورة)\s*/, "").trim();
  const first = clean.replace(/^ال(?=[\u0621-\u064A]{2})/, "")[0] || "•";
  return <span aria-hidden className={`grid place-items-center font-extrabold ${className}`} style={{ fontFamily: "var(--font-h)" }}>{first}</span>;
}

export function PhoneText({ phone }: { phone: string }) {
  return <span dir="ltr" className="tabular-nums">{displayPhone(phone)}</span>;
}

export const icons = {
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" /><path d="m9 12 2 2 4-4" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></>,
  phone: <path d="M5 4h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />,
  truck: <><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7z" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  refresh: <path d="M19.5 11A7.5 7.5 0 0 0 6 6.5L4.5 8M4.5 4v4h4M4.5 13A7.5 7.5 0 0 0 18 17.5l1.5-1.5M19.5 20v-4h-4" />,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>,
  sparkle: <path d="M12 3.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z" />,
  bag: <><path d="M5 8h14l-1.1 11.2A2 2 0 0 1 15.9 21H8.1a2 2 0 0 1-2-1.8z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></>,
};
export const WHY_ICONS = [icons.users, icons.chart, icons.shield, icons.clock, icons.heart, icons.star];

export function Svg({ children, size = 22, className = "" }: { children: React.ReactNode; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>{children}</svg>;
}
