import { DAYS, CLINIC_TYPE_LABEL } from "@/lib/demo/model";
import { SAMPLE_LABEL, SAMPLE_RESULTS, SAMPLE_RESULTS_LABEL } from "@/lib/demo/niches";
import { formatTime, hoursSummary } from "@/lib/quickPaste";
import { NicheArt } from "./Art";
import { ActionButton, BookingForm, MapFacade, ProductFilter, type FieldDef } from "./interactive";
import { WaGlyph } from "./runtime";
import { OwnerStrip } from "@/components/demo/DemoBar";
import { Container, Head, Img, Initials, Monogram, PhoneText, SampleBadge, Section, Svg, icons, WHY_ICONS, type T } from "./parts";

const btnBase = "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition";

function bookText(t: T) {
  const n = t.c.niche;
  if (n === "courses") return `أهلاً ${t.c.name} 👋 حابب أحجز مكان في مجموعة، ممكن أعرف المواعيد المتاحة؟`;
  if (n === "clinic") return `أهلاً ${t.c.name} 👋 حابب أحجز ميعاد كشف، إيه المواعيد المتاحة؟`;
  return `أهلاً ${t.c.name} 👋 حابب أسأل عن المنتجات المتاحة`;
}

function MainCta({ t, className = "", label }: { t: T; className?: string; label?: string }) {
  return (
    <ActionButton action={{ kind: "whatsapp", text: bookText(t), label: "hero" }} className={`${btnBase} tp-btn h-14 px-7 text-[17px] shadow-[0_14px_40px_-14px_var(--btn)] ${className}`}>
      <WaGlyph /> {label || t.ph.ctaMain}
    </ActionButton>
  );
}

/* ================= HERO ================= */
export function Hero({ t }: { t: T }) {
  const { c } = t;
  const photo = c.photos[0];
  const visual = photo ? (
    <Img src={photo} alt={c.name} mode={t.mode} priority sizes="(min-width: 1024px) 560px, 100vw" />
  ) : (
    <NicheArt niche={c.niche} seed={t.seed} primary={c.brand.primary} accent={c.brand.accent} dark={t.dark} className="absolute inset-0 size-full" label={`رسمة تعبيرية لـ ${c.name}`} />
  );
  const chips = c.why.slice(0, 3).map((w) => w.t);

  if (t.style === "bold") {
    return (
      <section id="hero" data-section="hero" data-label="الواجهة" className="relative overflow-hidden bg-deep text-white">
        <div aria-hidden className="absolute inset-0 grain opacity-40" />
        <div aria-hidden className="absolute -top-40 -end-40 size-[520px] rounded-full opacity-40 blur-3xl" style={{ background: "var(--a)" }} />
        <Container className="relative">
          <nav className="flex items-center justify-between gap-4 py-5" aria-label="الرئيسية">
            <a href="#hero" className="flex items-center gap-3 min-w-0">
              <Monogram t={t} size={42} />
              <span className="truncate font-bold text-[17px]" style={{ fontFamily: "var(--font-h)" }}>{c.name}</span>
            </a>
            {(t.phone || t.wa) && (
              <ActionButton action={{ kind: "call", label: "nav" }} className="hidden sm:flex items-center justify-center gap-2 rounded-2xl font-bold transition h-11 px-5 bg-white/10 hover:bg-white/15 text-white">
                <Svg size={18}>{icons.phone}</Svg><PhoneText phone={t.phone || t.wa} />
              </ActionButton>
            )}
          </nav>
          <div className="grid items-center gap-10 pb-16 pt-6 sm:pb-24 lg:grid-cols-[1.1fr_.9fr] lg:pt-10">
            <div className="rise">
              {c.area && (
                <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[14px] font-semibold">
                  <Svg size={16}>{icons.pin}</Svg>{c.area}
                </p>
              )}
              <h1 className="text-[40px] sm:text-[60px] font-extrabold leading-[1.08] tracking-tight">
                {c.tagline || c.name}
              </h1>
              <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-white/80">{t.ph.heroSub}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <MainCta t={t} />
                <a href={c.niche === "shop" ? "#items" : "#items"} className={`${btnBase} h-14 px-6 text-[16px] border border-white/25 text-white hover:bg-white/10`}>{t.ph.ctaSoft}</a>
              </div>
              {chips.length > 0 && (
                <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-[15px] text-white/85">
                  {chips.map((ch) => (
                    <li key={ch} className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-a text-a-ink"><Svg size={14}>{icons.check}</Svg></span>{ch}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="relative rise" style={{ animationDelay: ".1s" }}>
              <div className="relative aspect-[4/3.4] overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl rotate-[-1.5deg]">{visual}</div>
              <div className="absolute -bottom-6 start-4 sm:-start-6 rounded-2xl bg-card text-fg px-4 py-3 shadow-xl border border-line max-w-[260px]">
                <p className="text-[12px] text-mute">مواعيدنا</p>
                <p className="text-[14px] font-bold leading-snug">{shortHours(t)}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  // calm
  return (
    <section id="hero" data-section="hero" data-label="الواجهة" className="relative overflow-hidden bg-bg">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[520px]" style={{ background: "radial-gradient(70% 60% at 50% 0%, var(--p-soft), transparent 70%)" }} />
      <Container className="relative">
        <nav className="flex items-center justify-between gap-4 py-6" aria-label="الرئيسية">
          <a href="#hero" className="flex items-center gap-3 min-w-0">
            <Monogram t={t} size={40} />
            <span className="truncate font-semibold text-[17px]" style={{ fontFamily: "var(--font-h)" }}>{c.name}</span>
          </a>
          <ActionButton action={{ kind: "whatsapp", text: bookText(t), label: "nav" }} className={`${btnBase} h-11 px-5 text-[15px] border border-line bg-card hover:border-p`}>
            <WaGlyph size={18} /><span className="hidden sm:inline">{t.ph.ctaMain}</span><span className="sm:hidden">واتساب</span>
          </ActionButton>
        </nav>
        <div className="mx-auto max-w-3xl pt-10 pb-12 text-center sm:pt-16 rise">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-1.5 text-[14px] text-mute">
            <span className="size-2 rounded-full bg-a" aria-hidden />
            {c.niche === "clinic" ? `عيادة ${CLINIC_TYPE_LABEL[c.clinicType]}` : t.ph.bank.label}{c.area ? ` · ${c.area}` : ""}
          </p>
          <h1 className="text-[38px] sm:text-[58px] font-semibold leading-[1.15] tracking-tight">{c.tagline || c.name}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-[18px] text-mute leading-relaxed">{t.ph.heroSub}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <MainCta t={t} />
            {(t.phone || t.wa) && (
              <ActionButton action={{ kind: "call", label: "hero" }} className={`${btnBase} h-14 px-6 text-[16px] border border-line bg-card hover:border-p`}>
                <Svg size={18}>{icons.phone}</Svg> اتصل بينا
              </ActionButton>
            )}
          </div>
        </div>
        <div className="relative mx-auto mb-4 max-w-5xl rise" style={{ animationDelay: ".08s" }}>
          <div className="relative aspect-[16/8] sm:aspect-[16/7] overflow-hidden rounded-[36px] border border-line bg-card shadow-[0_40px_100px_-50px_rgba(0,0,0,.45)]">{visual}</div>
          <div className="absolute -bottom-7 inset-x-4 sm:inset-x-auto sm:end-8 flex justify-center">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-xl">
              <span className="grid size-10 place-items-center rounded-xl bg-p-soft text-p"><Svg>{icons.clock}</Svg></span>
              <div className="text-start"><p className="text-[12px] text-mute">مواعيدنا</p><p className="text-[14px] font-semibold">{shortHours(t)}</p></div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function shortHours(t: T) {
  const open = t.c.hours.map((h, i) => ({ ...h, i })).filter((h) => h.open);
  if (!open.length) return "حسب الحجز";
  const same = open.every((h) => h.from === open[0].from && h.to === open[0].to);
  const range = `${formatTime(open[0].from)} – ${formatTime(open[0].to)}`;
  if (same && open.length === 7) return `يومياً ${range}`;
  if (same) {
    const contiguous = open.every((h, k) => k === 0 || h.i === open[k - 1].i + 1);
    const days = contiguous ? `${DAYS[open[0].i]} – ${DAYS[open[open.length - 1].i]}` : `${open.length} أيام`;
    return `${days} · ${range}`;
  }
  return "شوف المواعيد تحت";
}

/* ================= ITEMS: subjects / services / products ================= */
export function Items({ t }: { t: T }) {
  const { c } = t;
  const bank = t.ph.bank;
  if (!c.services.length) return null;

  if (c.niche === "shop") return <Products t={t} />;

  if (t.style === "bold") {
    return (
      <Section id="items" label={bank.itemsTitle} t={t} className="bg-bg">
        <Container>
          <Head t={t} kicker={bank.itemsKicker} title={bank.itemsTitle} lead={c.niche === "courses" ? "اختار المادة، وشوف المواعيد تحت، واحجز مكانك على واتساب." : "خدمات بتتقدّم بعناية، وخطة واضحة قبل أي خطوة."} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.services.map((s, i) => (
              <li key={s.id} className="group relative overflow-hidden rounded-[26px] border border-line bg-card p-6 transition hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,.35)] hover:border-p">
                <svg aria-hidden viewBox="0 0 120 90" className="absolute -top-4 -end-2 w-[120px] text-p opacity-[.08] transition group-hover:opacity-[.15]"><text x="0" y="78" fill="currentColor" fontSize="88" fontWeight="800" style={{ fontFamily: "var(--font-h)" }}>{String(i + 1).padStart(2, "0")}</text></svg>
                {s.tag && <p className="mb-3 inline-flex rounded-full bg-a-soft px-3 py-1 text-[13px] font-semibold">{s.tag}</p>}
                <h3 className="text-[22px] font-extrabold">{s.title}</h3>
                {s.desc && <p className="mt-2 text-mute">{s.desc}</p>}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-[15px] font-bold text-p">{s.price ? s.price : c.niche === "clinic" ? "السعر بعد الكشف" : "اسأل عن المواعيد"}</span>
                  <ActionButton action={{ kind: "whatsapp", text: `أهلاً ${c.name} 👋 حابب أسأل عن: ${s.title}${s.tag ? ` (${s.tag})` : ""}`, label: `item:${s.title}` }} className="grid size-11 place-items-center rounded-full tp-btn transition group-hover:scale-105" ariaLabel={`اسأل عن ${s.title} على واتساب`}>
                    <Svg size={18}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    );
  }

  return (
    <Section id="items" label={bank.itemsTitle} t={t} className="bg-bg2">
      <Container>
        <Head t={t} kicker={bank.itemsKicker} title={bank.itemsTitle} />
        <ul className="mx-auto max-w-4xl divide-y divide-line overflow-hidden rounded-[30px] border border-line bg-card">
          {c.services.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7 transition hover:bg-bg2/60">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-p-soft text-p"><Svg>{c.niche === "courses" ? icons.book : icons.sparkle}</Svg></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[19px] font-semibold">{s.title}{s.tag && <span className="ms-2 align-middle text-[13px] font-normal text-mute">· {s.tag}</span>}</h3>
                {s.desc && <p className="mt-1 text-mute">{s.desc}</p>}
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                {s.price && <span className="font-semibold text-p">{s.price}</span>}
                <ActionButton action={{ kind: "whatsapp", text: `أهلاً ${c.name} 👋 حابب أسأل عن: ${s.title}`, label: `item:${s.title}` }} className="text-[15px] font-semibold text-p underline decoration-2 underline-offset-[6px] hover:decoration-a">
                  {c.niche === "clinic" ? "احجز" : "احجز مكانك"}
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

function Products({ t }: { t: T }) {
  const { c } = t;
  const cats = [...new Set(c.services.map((s) => s.tag).filter(Boolean))];
  const calm = t.style === "calm";
  return (
    <Section id="items" label="المنتجات" t={t} className={calm ? "bg-bg" : "bg-bg2"}>
      <Container>
        <Head t={t} kicker={t.ph.bank.itemsKicker} title={calm ? "اختاري اللي يعجبك" : "المنتجات"} lead="اضغط «اطلب على واتساب» وهتتفتح رسالة جاهزة باسم المنتج." center={calm} />
        <ProductFilter categories={cats}>
          <ul className={`grid gap-4 sm:gap-5 ${calm ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
            {c.services.map((s, i) => (
              <li key={s.id} data-product={s.tag} className={`group flex flex-col overflow-hidden border border-line bg-card transition hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,.4)] ${calm ? "rounded-[28px]" : "rounded-[22px]"}`}>
                <div className={`relative overflow-hidden ${calm ? "aspect-[4/5]" : "aspect-square"}`}>
                  {s.image ? <Img src={s.image} alt={s.title} mode={t.mode} sizes="(min-width:1024px) 300px, 50vw" className="transition duration-500 group-hover:scale-105" />
                    : <NicheArt niche="shop" seed={t.seed} variant={i + 1} primary={c.brand.primary} accent={c.brand.accent} dark={t.dark} className="absolute inset-0 size-full transition duration-500 group-hover:scale-105" />}
                  {s.tag && <span className="absolute top-3 start-3 rounded-full bg-card/90 px-3 py-1 text-[12px] font-semibold backdrop-blur">{s.tag}</span>}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <h3 className="text-[16px] sm:text-[17px] font-bold leading-snug">{s.title}</h3>
                  {s.desc && <p className="text-[14px] text-mute line-clamp-2">{s.desc}</p>}
                  <p className="mt-1 font-bold text-p">{s.price || "اسأل عن السعر"}</p>
                  <ActionButton action={{ kind: "whatsapp", text: `أهلاً ${c.name} 👋 عايز أطلب: ${s.title}${s.price ? ` (${s.price})` : ""}`, label: `product:${s.title}` }}
                    className={`${btnBase} tp-btn mt-auto h-11 w-full text-[14px] sm:text-[15px] ${calm ? "rounded-full" : ""}`}>
                    <WaGlyph size={17} /> اطلب على واتساب
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        </ProductFilter>
      </Container>
    </Section>
  );
}

/* ================= SCHEDULE (courses) ================= */
export function Schedule({ t }: { t: T }) {
  const { c } = t;
  if (!c.schedule.length) return null;
  const calm = t.style === "calm";
  return (
    <Section id="schedule" label="الجدول" t={t} className={calm ? "bg-bg2" : "bg-bg2"}>
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Head t={t} kicker="المواعيد" title="جدول الحصص" center={false} />
          {c.seats && (
            <p className="mb-10 inline-flex items-center gap-2 rounded-full bg-a px-4 py-2 text-[14px] font-bold text-a-ink">
              <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-current" /></span>
              {c.seats}
            </p>
          )}
        </div>
        {/* Table on wide screens, stacked cards on phones. */}
        <div className="hidden md:block overflow-hidden rounded-[26px] border border-line bg-card">
          <table className="w-full text-start">
            <thead className={calm ? "bg-p-soft" : "bg-deep text-white"}>
              <tr>{["اليوم", "الساعة", "المادة", "المدرّس"].map((h) => <th key={h} scope="col" className="px-6 py-4 text-start text-[14px] font-bold">{h}</th>)}<th className="w-px"><span className="sr-only">حجز</span></th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {c.schedule.map((s) => (
                <tr key={s.id} className="transition hover:bg-bg2/70">
                  <td className="px-6 py-4 font-semibold">{s.day}</td>
                  <td className="px-6 py-4 tabular-nums">{s.time}</td>
                  <td className="px-6 py-4"><span className="rounded-full bg-p-soft px-3 py-1 text-[14px] font-semibold text-p">{s.subject}</span></td>
                  <td className="px-6 py-4 text-mute">{s.teacher}</td>
                  <td className="px-4 py-3">
                    <ActionButton action={{ kind: "whatsapp", text: `أهلاً ${c.name} 👋 حابب أحجز في مجموعة ${s.subject} يوم ${s.day} الساعة ${s.time}`, label: `slot:${s.subject}` }} className={`${btnBase} h-10 px-4 text-[14px] tp-btn`}>احجز</ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="grid gap-3 md:hidden">
          {c.schedule.map((s) => (
            <li key={s.id} className="flex items-center gap-4 rounded-[22px] border border-line bg-card p-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-p-soft text-center text-p"><span className="text-[13px] font-bold leading-tight tabular-nums">{s.time}</span></div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{s.subject}</p>
                <p className="text-[14px] text-mute truncate">{s.day} · {s.teacher}</p>
              </div>
              <ActionButton action={{ kind: "whatsapp", text: `أهلاً ${c.name} 👋 حابب أحجز في مجموعة ${s.subject} يوم ${s.day} الساعة ${s.time}`, label: `slot:${s.subject}` }} className={`${btnBase} h-10 px-4 text-[14px] tp-btn`}>احجز</ActionButton>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* ================= PEOPLE: teachers / doctor ================= */
export function People({ t }: { t: T }) {
  const { c } = t;
  if (!c.people.length) return null;
  const bank = t.ph.bank;
  const single = c.people.length === 1;
  const calm = t.style === "calm";

  if (single) {
    const p = c.people[0];
    return (
      <Section id="people" label={bank.peopleTitle} t={t} className={calm ? "bg-bg" : "bg-bg"}>
        <Container>
          <div className={`grid items-center gap-8 overflow-hidden rounded-[34px] border border-line p-6 sm:p-10 lg:grid-cols-[320px_1fr] ${calm ? "bg-bg2" : "bg-card"}`}>
            <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-[28px] bg-p-soft">
              <NicheArt niche={c.niche} seed={t.seed} variant={7} primary={c.brand.primary} accent={c.brand.accent} dark={t.dark} className="absolute inset-0 size-full opacity-70" />
              <Initials name={p.name} className="absolute inset-0 text-[64px] text-p" />
            </div>
            <div>
              <p className="mb-2 text-[14px] font-bold text-p">{bank.peopleTitle}</p>
              <h2 className="text-[30px] sm:text-[38px] font-extrabold">{p.name}</h2>
              {p.role && <p className="mt-1 text-[17px] font-semibold text-mute">{p.role}</p>}
              {p.bio && <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-mute">{p.bio}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <MainCta t={t} />
              </div>
            </div>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section id="people" label={bank.peopleTitle} t={t} className="bg-bg">
      <Container>
        <Head t={t} kicker="فريقنا" title={c.niche === "courses" ? "المدرّسين" : bank.peopleTitle} lead={c.niche === "courses" ? "كل مادة مع مدرّس متخصص فيها." : undefined} />
        <ul className={`grid gap-4 ${c.people.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
          {c.people.map((p, i) => (
            <li key={p.id} className={`group rounded-[26px] border border-line bg-card p-6 transition hover:border-p ${calm ? "text-center" : ""}`}>
              <div className={`mb-4 flex items-center gap-4 ${calm ? "flex-col" : ""}`}>
                <span className={`relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl ${i % 2 ? "bg-a-soft text-fg" : "bg-p-soft text-p"}`}>
                  <Initials name={p.name} className="text-[22px]" />
                </span>
                <div>
                  <h3 className="text-[19px] font-bold">{p.name}</h3>
                  {p.role && <p className="text-[14px] font-semibold text-p">{p.role}</p>}
                </div>
              </div>
              {p.bio && <p className="text-[15px] text-mute">{p.bio}</p>}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* ================= WHY ================= */
export function Why({ t }: { t: T }) {
  const { c } = t;
  if (!c.why.length) return null;
  if (t.style === "bold") {
    return (
      <Section id="why" label="ليه تختارنا" t={t} className="bg-deep text-white">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-10">
              <p className="mb-3 flex items-center gap-3 text-[14px] font-bold text-a"><span className="h-[3px] w-8 rounded-full bg-a" aria-hidden />ليه تختارنا</p>
              <h2 className="text-[32px] sm:text-[44px] font-extrabold leading-[1.15]">{c.niche === "courses" ? "مش مجرد حصص… ده نظام مذاكرة" : c.niche === "clinic" ? "راحتك وصحتك أولاً" : "تجربة طلب سهلة ومضمونة"}</h2>
              <p className="mt-4 text-white/75 text-[17px]">{t.ph.closing}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {c.why.map((w, i) => (
                <li key={w.id} className="rounded-[24px] border border-white/10 bg-white/[.05] p-6 transition hover:bg-white/[.08]">
                  <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-a text-a-ink"><Svg>{WHY_ICONS[i % WHY_ICONS.length]}</Svg></span>
                  <h3 className="text-[19px] font-bold">{w.t}</h3>
                  {w.d && <p className="mt-1.5 text-white/75">{w.d}</p>}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>
    );
  }
  return (
    <Section id="why" label="ليه تختارنا" t={t} className="bg-bg">
      <Container>
        <Head t={t} kicker="ليه تختارنا" title={c.niche === "courses" ? "اللي بيفرّقنا" : c.niche === "clinic" ? "ليه المرضى بيرجعولنا" : "ليه تطلب مننا"} />
        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {c.why.map((w, i) => (
            <li key={w.id} className="text-center">
              <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full border border-line bg-card text-p shadow-sm"><Svg>{WHY_ICONS[i % WHY_ICONS.length]}</Svg></span>
              <h3 className="text-[18px] font-semibold">{w.t}</h3>
              {w.d && <p className="mt-1.5 text-[15px] text-mute">{w.d}</p>}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* ================= RESULTS (courses, always labelled as an example) ================= */
export function Results({ t }: { t: T }) {
  const calm = t.style === "calm";
  return (
    <Section id="results" label="أوائلنا" t={t} className={calm ? "bg-bg" : "bg-bg2"}>
      <Container>
        <div className="mb-4 flex justify-center sm:justify-start"><SampleBadge text={SAMPLE_RESULTS_LABEL} /></div>
        <Head t={t} kicker="فخورين بيهم" title="أوائلنا" center={calm} />
        <ul className="grid gap-4 sm:grid-cols-3">
          {SAMPLE_RESULTS.map((r, i) => (
            <li key={i} className={`relative overflow-hidden rounded-[26px] border border-dashed border-line bg-card p-6 ${i === 0 && !calm ? "sm:-translate-y-3" : ""}`}>
              <span aria-hidden className="absolute -top-6 -end-6 size-24 rounded-full bg-a-soft" />
              <p className="relative text-[44px] font-extrabold text-p tabular-nums" style={{ fontFamily: "var(--font-h)" }}>{r.score}</p>
              <p className="relative font-bold">{r.name}</p>
              <p className="relative text-[14px] text-mute">{r.grade}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* ================= SAMPLE TESTIMONIALS (labelled) ================= */
export function Testimonials({ t }: { t: T }) {
  const quotes = t.ph.bank.sampleQuotes;
  return (
    <Section id="testimonials" label="آراء" t={t} className="bg-bg2">
      <Container>
        <div className="mb-4 flex justify-center"><SampleBadge text={SAMPLE_LABEL} /></div>
        <Head t={t} kicker="آراء العملاء" title="هنا هتظهر آراء عملائكم" center />
        <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {quotes.map((q, i) => (
            <li key={i} className="rounded-[26px] border border-dashed border-line bg-card p-6">
              <div className="mb-3 flex gap-1 text-a" aria-hidden>{[0, 1, 2, 3, 4].map((k) => <Svg key={k} size={18}>{icons.star}</Svg>)}</div>
              <p className="text-[17px] leading-relaxed">«{q.text}»</p>
              <p className="mt-3 text-[14px] text-mute">— {q.who} <span className="text-[12px]">(مثال)</span></p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* ================= BEFORE / AFTER (clinic, labelled) ================= */
export function BeforeAfter({ t }: { t: T }) {
  const { c } = t;
  return (
    <Section id="before-after" label="قبل وبعد" t={t} className="bg-bg">
      <Container>
        <div className="mb-4 flex justify-center sm:justify-start"><SampleBadge text="مثال – هيتغيّر بصور حالات حقيقية بموافقة أصحابها" /></div>
        <Head t={t} kicker="نتايج" title="قبل وبعد" lead="مساحة لعرض حالات حقيقية من العيادة (بموافقة المرضى)." center={t.style === "calm"} />
        <div className="grid gap-4 sm:grid-cols-2">
          {["قبل", "بعد"].map((lbl, i) => (
            <figure key={lbl} className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-dashed border-line bg-bg2">
              <NicheArt niche="clinic" seed={t.seed} variant={20 + i} primary={i ? c.brand.primary : "#9aa3ad"} accent={i ? c.brand.accent : "#c5ccd3"} dark={t.dark} className="absolute inset-0 size-full" />
              <figcaption className="absolute top-4 start-4 rounded-full bg-card px-4 py-1.5 text-[14px] font-bold shadow">{lbl}</figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* ================= NOTES (clinic insurance) ================= */
export function Notes({ t }: { t: T }) {
  const { c } = t;
  if (!c.insurance) return null;
  return (
    <Section id="notes" label="التأمين والملاحظات" t={t} className="bg-bg2 !py-14">
      <Container>
        <div className="flex flex-col gap-5 rounded-[30px] border border-line bg-card p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-p-soft text-p"><Svg size={26}>{icons.shield}</Svg></span>
          <div className="flex-1">
            <h2 className="text-[22px] font-bold">التأمين والتعاقدات</h2>
            <p className="mt-1 text-mute">{c.insurance}</p>
          </div>
          <ActionButton action={{ kind: "whatsapp", text: `أهلاً ${c.name} 👋 حابب أسأل عن التأمين: `, label: "insurance" }} className={`${btnBase} h-12 px-5 border border-line hover:border-p`}>اسأل عن شركتك</ActionButton>
        </div>
      </Container>
    </Section>
  );
}

/* ================= DELIVERY + RETURNS (shop) ================= */
export function Delivery({ t }: { t: T }) {
  const { c } = t;
  if (!c.delivery && !c.returns) return null;
  return (
    <Section id="delivery" label="التوصيل والاسترجاع" t={t} className="bg-bg">
      <Container>
        <div className="grid gap-4 md:grid-cols-2">
          {c.delivery && (
            <div className="rounded-[28px] bg-p-soft p-7">
              <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-card text-p"><Svg>{icons.truck}</Svg></span>
              <h2 className="text-[24px] font-extrabold">مناطق التوصيل</h2>
              <p className="mt-2 text-[17px]">{c.delivery}</p>
            </div>
          )}
          {c.returns && (
            <div className="rounded-[28px] border border-line bg-card p-7">
              <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-a-soft text-fg"><Svg>{icons.refresh}</Svg></span>
              <h2 className="text-[24px] font-extrabold">سياسة الاستبدال والاسترجاع</h2>
              <p className="mt-2 text-[17px] text-mute">{c.returns}</p>
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}

/* ================= FORM ================= */
export function FormSection({ t }: { t: T }) {
  const { c } = t;
  let fields: FieldDef[];
  let submit: string;
  if (c.niche === "courses") {
    const grades = [...new Set(c.services.map((s) => s.tag).filter(Boolean))];
    fields = [
      { name: "student", label: "اسم الطالب", required: true, autoComplete: "name", placeholder: "الاسم بالكامل" },
      grades.length ? { name: "grade", label: "الصف", type: "select", options: grades, required: true } : { name: "grade", label: "الصف", required: true, placeholder: "مثلاً: تالتة ثانوي" },
      { name: "subject", label: "المادة", type: "select", options: c.services.map((s) => s.title), required: true },
      { name: "phone", label: "موبايل ولي الأمر", type: "tel", required: true, autoComplete: "tel", placeholder: "01xxxxxxxxx" },
    ];
    submit = "احجز مكانك";
  } else if (c.niche === "clinic") {
    fields = [
      { name: "name", label: "الاسم", required: true, autoComplete: "name" },
      { name: "phone", label: "رقم الموبايل", type: "tel", required: true, autoComplete: "tel", placeholder: "01xxxxxxxxx" },
      { name: "service", label: "الخدمة", type: "select", options: c.services.map((s) => s.title), required: true },
      { name: "day", label: "اليوم المناسب", type: "select", options: DAYS.filter((_, i) => c.hours[i]?.open), required: true },
      { name: "time", label: "الوقت المناسب", type: "select", options: ["الصبح", "بعد الضهر", "بالليل"] },
    ];
    submit = "احجز ميعادك";
  } else {
    fields = [
      { name: "name", label: "الاسم", required: true, autoComplete: "name" },
      { name: "phone", label: "رقم الموبايل", type: "tel", required: true, autoComplete: "tel", placeholder: "01xxxxxxxxx" },
      { name: "want", label: "بتدوّر على إيه؟", required: true },
    ];
    submit = "ابعت";
  }
  const calm = t.style === "calm";
  return (
    <Section id="form" label="فورم الحجز" t={t} className={calm ? "bg-bg2" : "bg-bg"}>
      <Container>
        <div className={`grid items-start gap-10 ${calm ? "mx-auto max-w-2xl" : "lg:grid-cols-[.85fr_1.15fr]"}`}>
          <div className={calm ? "text-center" : ""}>
            <Head t={t} kicker={c.niche === "courses" ? "التسجيل" : "الحجز"} title={t.ph.formTitle} lead="املأ البيانات وهنكلّمك نأكد معاك في أسرع وقت." center={calm} />
            {!calm && (
              <ul className="-mt-4 space-y-3 text-[16px]">
                {["تأكيد على واتساب", "من غير أي دفع مقدّم", "تقدر تغيّر الميعاد بسهولة"].map((x) => (
                  <li key={x} className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-p-soft text-p"><Svg size={15}>{icons.check}</Svg></span>{x}</li>
                ))}
              </ul>
            )}
          </div>
          <BookingForm fields={fields} submitLabel={submit} formLabel={c.niche === "courses" ? "حجز مكان" : c.niche === "clinic" ? "حجز ميعاد" : "استفسار"} />
        </div>
      </Container>
    </Section>
  );
}

/* ================= LOCATION + HOURS ================= */
export function Location({ t }: { t: T }) {
  const { c } = t;
  const query = c.address || [c.name, c.area].filter(Boolean).join(" ");
  const calm = t.style === "calm";
  return (
    <Section id="location" label="المكان والمواعيد" t={t} className={calm ? "bg-bg" : "bg-bg2"}>
      <Container>
        <Head t={t} kicker="زورنا" title="المكان والمواعيد" center={calm} />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="overflow-hidden rounded-[28px] border border-line bg-card">
            <MapFacade query={query} label={c.name} className="h-[280px] sm:h-[360px]" />
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="flex items-start gap-2 text-[16px]"><Svg className="mt-1 shrink-0 text-p">{icons.pin}</Svg><span>{c.address || c.area || "العنوان هيتكتب هنا"}</span></p>
              {c.mapsUrl && <a href={c.mapsUrl} target="_blank" rel="noopener nofollow" className="text-[15px] font-semibold text-p underline underline-offset-4">افتح في جوجل ماب</a>}
            </div>
          </div>
          <div className="rounded-[28px] border border-line bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-[19px] font-bold"><Svg className="text-p">{icons.clock}</Svg>مواعيد العمل</h3>
            <dl className="divide-y divide-line">
              {DAYS.map((d, i) => {
                const h = c.hours[i];
                return (
                  <div key={d} className="flex items-center justify-between py-2.5 text-[15px]">
                    <dt className="font-semibold">{d}</dt>
                    <dd className={h.open ? "tabular-nums" : "text-mute"}>{h.open ? `${formatTime(h.from)} – ${formatTime(h.to)}` : "مغلق"}</dd>
                  </div>
                );
              })}
            </dl>
            {(t.phone || t.wa) && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <ActionButton action={{ kind: "call", label: "location" }} className={`${btnBase} h-12 border border-line hover:border-p text-[15px]`}><Svg size={18}>{icons.phone}</Svg>اتصال</ActionButton>
                <ActionButton action={{ kind: "whatsapp", text: bookText(t), label: "location" }} className={`${btnBase} h-12 tp-btn text-[15px]`}><WaGlyph size={18} />واتساب</ActionButton>
              </div>
            )}
          </div>
        </div>
        <p className="sr-only">{hoursSummary(c.hours)}</p>
      </Container>
    </Section>
  );
}

/* ================= FAQ ================= */
export function Faq({ t }: { t: T }) {
  const { c } = t;
  if (!c.faq.length) return null;
  const calm = t.style === "calm";
  return (
    <Section id="faq" label="الأسئلة الشائعة" t={t} className={calm ? "bg-bg2" : "bg-bg"}>
      <Container>
        <div className={calm ? "mx-auto max-w-3xl" : "grid gap-10 lg:grid-cols-[.7fr_1.3fr]"}>
          <Head t={t} kicker="عندك سؤال؟" title="أسئلة بتتكرر" center={calm} />
          <div className="space-y-3">
            {c.faq.map((f, i) => (
              <details key={f.id} className="group rounded-[22px] border border-line bg-card px-5 transition open:border-p open:shadow-[0_20px_50px_-35px_rgba(0,0,0,.4)]" open={i === 0}>
                <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 text-[17px] font-bold">
                  {f.q}
                  <span className="faq-icon grid size-8 shrink-0 place-items-center rounded-full bg-p-soft text-p transition-transform"><Svg size={16}><path d="M12 5v14M5 12h14" /></Svg></span>
                </summary>
                <p className="pb-5 text-mute">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ================= GALLERY (when the business uploaded photos) ================= */
export function Gallery({ t }: { t: T }) {
  const photos = t.c.photos.slice(1);
  if (photos.length < 2) return null;
  return (
    <Section id="gallery" label="صور" t={t} className="bg-bg">
      <Container>
        <Head t={t} kicker="من جوّه" title="صور من عندنا" center={t.style === "calm"} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p} className={`relative overflow-hidden rounded-[22px] bg-bg2 ${i === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : "aspect-square"}`}>
              <Img src={p} alt={`صورة ${i + 2} من ${t.c.name}`} mode={t.mode} sizes="(min-width:640px) 33vw, 50vw" />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* ================= CLOSING + FOOTER ================= */
export function Closing({ t }: { t: T }) {
  const { c } = t;
  return (
    <section id="closing" data-section="closing" data-label="الختام" className={t.style === "bold" ? "bg-bg py-16 sm:py-20" : "bg-bg py-20"}>
      <Container>
        <div className={`relative overflow-hidden rounded-[36px] p-8 sm:p-14 ${t.style === "bold" ? "bg-deep text-white" : "bg-p-soft text-fg text-center"}`}>
          {t.style === "bold" && <div aria-hidden className="absolute -bottom-24 -start-24 size-72 rounded-full bg-a opacity-30 blur-2xl" />}
          <div className={`relative flex flex-col gap-6 ${t.style === "bold" ? "md:flex-row md:items-center md:justify-between" : "items-center"}`}>
            <div>
              <h2 className="text-[30px] sm:text-[42px] font-extrabold leading-tight">{t.ph.closing}</h2>
              <p className={`mt-2 text-[17px] ${t.style === "bold" ? "text-white/75" : "text-mute"}`}>كلّمنا على واتساب، والرد في أسرع وقت.</p>
            </div>
            <MainCta t={t} />
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Footer({ t }: { t: T }) {
  const { c } = t;
  return (
    <footer className={`border-t border-line bg-bg pt-10 md:pb-10 ${t.mode === "demo" ? "pb-40" : "pb-28"}`}>
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Monogram t={t} size={36} />
          <div>
            <p className="font-bold">{c.name}</p>
            {c.nameEn && <p className="text-[13px] text-mute" dir="ltr">{c.nameEn}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-mute">
          {(t.phone || t.wa) && <span className="flex items-center gap-1.5"><Svg size={16}>{icons.phone}</Svg><PhoneText phone={t.phone || t.wa} /></span>}
          {c.area && <span className="flex items-center gap-1.5"><Svg size={16}>{icons.pin}</Svg>{c.area}</span>}
          {c.instagram && <a href={c.instagram} target="_blank" rel="noopener nofollow" className="underline underline-offset-4 hover:text-fg">إنستجرام</a>}
        </div>
      </Container>
      <Container className="mt-6 text-[12.5px] text-mute">
        © {new Date().getFullYear()} {c.name} · تصميم وتطوير <a href="https://mohammed-emad-portfolio.vercel.app" target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-fg">ME Web</a>
      </Container>
    </footer>
  );
}

/* ================= STICKY MOBILE BAR ================= */
export function StickyBar({ t }: { t: T }) {
  if (!t.phone && !t.wa) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      {t.mode === "demo" && <OwnerStrip name={t.c.name} ownerWhatsapp={t.ownerWa} />}
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <ActionButton action={{ kind: "call", label: "sticky" }} className={`${btnBase} h-12 w-14 border border-line`} ariaLabel="اتصال"><Svg>{icons.phone}</Svg></ActionButton>
        <ActionButton action={{ kind: "whatsapp", text: bookText(t), label: "sticky" }} className={`${btnBase} tp-btn h-12 text-[16px]`}><WaGlyph /> {t.ph.ctaMain}</ActionButton>
      </div>
    </div>
  );
}
