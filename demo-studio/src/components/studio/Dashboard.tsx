"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NICHE_LABEL, NICHE_SHORT, NICHES, STATUS_LABEL, STATUSES, type Niche, type Status } from "@/lib/demo/model";
import type { DemoDTO } from "@/lib/dto";
import { arAgo, arDate, daysLeft } from "@/lib/expiry";
import { NicheArt } from "@/templates/Art";
import { api, copyText } from "./api";
import { Icon } from "./Icon";
import { useToast } from "./StudioShell";

export const STATUS_TONE: Record<Status, string> = {
  request: "bg-[#3b2a0b] text-[#ffcf70]",
  draft: "bg-white/[.06] text-fg2",
  sent: "bg-[#14234d] text-[#9db4ff]",
  opened: "bg-[#3a1d0e] text-[#ffb08a]",
  interested: "bg-[#2c1747] text-[#d4b0ff]",
  won: "bg-[#0f3324] text-[#7ee2b0]",
  lost: "bg-white/[.04] text-fg3",
};

const HOT_MS = 3 * 3600_000;

export function Dashboard({ initial }: { initial: DemoDTO[] }) {
  const [demos, setDemos] = useState(initial);
  const [q, setQ] = useState("");
  const [niche, setNiche] = useState<Niche | "all">("all");
  const [status, setStatus] = useState<Status | "all" | "archived">("all");
  const [now, setNow] = useState(() => Date.now());
  const toast = useToast();

  useEffect(() => {
    const refresh = () => api<{ demos: DemoDTO[] }>("/api/studio/demos").then((r) => { setDemos(r.demos); setNow(Date.now()); }).catch(() => {});
    window.addEventListener("studio:activity", refresh);
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => { window.removeEventListener("studio:activity", refresh); clearInterval(t); };
  }, []);

  const real = demos.filter((d) => !d.isSample);
  const stats = [
    { label: "نماذج اتعملت", value: real.length, icon: "sparkles" },
    { label: "اتفتحت", value: real.filter((d) => d.firstOpenedAt).length, icon: "eye" },
    { label: "مهتمين", value: real.filter((d) => d.status === "interested").length, icon: "fire" },
    { label: "اتقفلت ✅", value: real.filter((d) => d.status === "won").length, icon: "check" },
  ];
  const requests = demos.filter((d) => d.status === "request" && !d.archived).length;

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return demos
      .filter((d) => (status === "archived" ? d.archived : !d.archived))
      .filter((d) => niche === "all" || d.niche === niche)
      .filter((d) => status === "all" || status === "archived" || d.status === status)
      .filter((d) => !term || [d.name, d.slug, d.content.area, d.content.phone, d.note].join(" ").toLowerCase().includes(term))
      .sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0) || b.updatedAt - a.updatedAt);
  }, [demos, q, niche, status]);

  function replace(d: DemoDTO) { setDemos((l) => l.map((x) => (x.id === d.id ? d : x))); }

  async function patch(d: DemoDTO, body: Record<string, unknown>, msg?: string) {
    try {
      const r = await api<{ demo: DemoDTO }>(`/api/studio/demos/${d.id}`, { method: "PATCH", body });
      if (body.action === "duplicate") setDemos((l) => [r.demo, ...l]);
      else replace(r.demo);
      if (msg) toast({ text: msg, tone: "ok" });
    } catch (e) { toast({ text: (e as Error).message, tone: "err" }); }
  }
  async function remove(d: DemoDTO) {
    try {
      await api(`/api/studio/demos/${d.id}`, { method: "DELETE" });
      setDemos((l) => l.filter((x) => x.id !== d.id));
      toast({ text: "اتمسح", tone: "ok" });
    } catch (e) { toast({ text: (e as Error).message, tone: "err" }); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">النماذج</h1>
          <p className="text-fg2 text-sm mt-1">اعمل نموذج في أقل من 5 دقايق، وابعته قبل ما تكلّم.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/studio/import" className="btn btn-ghost"><Icon name="csv" size={16} />استيراد CSV</Link>
          <Link href="/studio/new" className="btn btn-primary"><Icon name="plus" size={16} />نموذج جديد</Link>
        </div>
      </div>

      <section aria-label="إحصائيات" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <span className="grid place-items-center size-10 rounded-xl bg-cobalt/15 text-cobalt-2"><Icon name={s.icon} /></span>
            <div>
              <div className="text-2xl font-semibold tabular-nums leading-tight">{s.value}</div>
              <div className="text-fg2 text-[13px]">{s.label}</div>
            </div>
          </div>
        ))}
      </section>

      {requests > 0 && status !== "request" && (
        <button onClick={() => setStatus("request")} className="w-full mb-4 card px-4 py-3 flex items-center gap-3 text-start border-[#ffcf70]/30 hover:border-[#ffcf70]/60 transition-colors">
          <span className="size-2.5 rounded-full bg-[#ffcf70] hot-dot" />
          <span className="text-sm"><b>{requests}</b> طلب جديد من البورتفوليو مستني نموذج</span>
          <Icon name="arrow" size={16} className="ms-auto text-fg2" />
        </button>
      )}

      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <label className="relative flex-1">
          <span className="sr-only">بحث</span>
          <Icon name="search" size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-fg3" />
          <input className="field ps-9" placeholder="دوّر بالاسم، المنطقة، الرقم…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="flex gap-2 overflow-x-auto scrollbar-none" role="group" aria-label="النوع">
          {(["all", ...NICHES] as const).map((n) => (
            <button key={n} onClick={() => setNiche(n)} aria-pressed={niche === n} className={`chip h-10 px-4 border transition-colors ${niche === n ? "bg-ivory text-ink border-ivory" : "border-white/10 text-fg2 hover:text-ivory"}`}>
              {n === "all" ? "الكل" : NICHE_SHORT[n]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none mb-6 pb-1" role="group" aria-label="الحالة">
        {(["all", ...STATUSES, "archived"] as const).map((s) => {
          const count = s === "all" ? demos.filter((d) => !d.archived).length : s === "archived" ? demos.filter((d) => d.archived).length : demos.filter((d) => !d.archived && d.status === s).length;
          return (
            <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s} className={`chip h-8 border transition-colors ${status === s ? "bg-cobalt border-cobalt text-white" : "border-white/10 text-fg2 hover:text-ivory"}`}>
              {s === "all" ? "كل الحالات" : s === "archived" ? "الأرشيف" : STATUS_LABEL[s]}
              <span className="opacity-60 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg mb-1">مفيش نماذج هنا لسه</p>
          <p className="text-fg2 text-sm mb-5">ابدأ بأول نموذج، أو ارفع شيت الليدز بتاعك.</p>
          <Link href="/studio/new" className="btn btn-primary"><Icon name="plus" size={16} />نموذج جديد</Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {shown.map((d) => (
              <motion.li key={d.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} transition={{ duration: .2 }}>
                <DemoCard d={d} now={now} onPatch={patch} onDelete={remove} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

export function Thumb({ d, className = "" }: { d: Pick<DemoDTO, "content" | "slug" | "niche">; className?: string }) {
  const c = d.content;
  const photo = c.photos[0];
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: c.brand.mode === "dark" ? "#10131A" : "#fff" }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      ) : (
        <NicheArt niche={d.niche as Niche} seed={d.slug} primary={c.brand.primary} accent={c.brand.accent} dark={c.brand.mode === "dark"} className="absolute inset-0 size-full" />
      )}
      {c.brand.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.brand.logo} alt="" className="absolute top-3 start-3 h-10 max-w-[45%] object-contain rounded-lg bg-white/90 p-1" loading="lazy" />
      )}
    </div>
  );
}

function DemoCard({ d, now, onPatch, onDelete }: { d: DemoDTO; now: number; onPatch: (d: DemoDTO, b: Record<string, unknown>, m?: string) => void; onDelete: (d: DemoDTO) => void }) {
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  const hot = d.lastOpenedAt && now - d.lastOpenedAt < HOT_MS;
  const left = daysLeft(d.expiresAt, now);
  const isPublic = !["draft", "request"].includes(d.status);

  return (
    <article className="card overflow-hidden group hover:border-white/15 transition-colors h-full flex flex-col">
      <Link href={`/studio/demos/${d.id}`} className="block relative" aria-label={`تعديل ${d.name}`}>
        <Thumb d={d} className="aspect-[16/8]" />
        <div className="absolute top-3 end-3 flex gap-1.5">
          {d.isSample ? <span className="chip bg-black/60 text-white backdrop-blur">عيّنة</span> : null}
          {d.siteLive ? <span className="chip bg-[#0f3324]/90 text-[#7ee2b0] backdrop-blur">موقع حقيقي</span> : null}
        </div>
        {hot && (
          <span className="absolute bottom-3 start-3 chip bg-black/70 text-white backdrop-blur">
            <span className="size-2 rounded-full bg-hot hot-dot" />فتحه {arAgo(d.lastOpenedAt!, now)} 🔥
          </span>
        )}
      </Link>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold truncate"><Link href={`/studio/demos/${d.id}`} className="hover:text-cobalt-2 transition-colors">{d.name}</Link></h2>
            <p className="text-fg3 text-[13px] truncate">{NICHE_LABEL[d.niche as Niche]}{d.content.area ? ` · ${d.content.area}` : ""}</p>
          </div>
          <label className="shrink-0">
            <span className="sr-only">الحالة</span>
            <select value={d.status} onChange={(e) => onPatch(d, { status: e.target.value }, "اتحدّثت الحالة")} className={`chip h-8 ps-3 pe-2 border-0 cursor-pointer font-medium ${STATUS_TONE[d.status as Status]}`}>
              {STATUSES.map((s) => <option key={s} value={s} className="bg-ink text-ivory">{STATUS_LABEL[s]}</option>)}
            </select>
          </label>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-[13px]">
          <div className="rounded-xl bg-white/[.03] px-2.5 py-2"><dt className="text-fg3">زيارات</dt><dd className="font-semibold tabular-nums">{d.views}</dd></div>
          <div className="rounded-xl bg-white/[.03] px-2.5 py-2"><dt className="text-fg3">آخر فتح</dt><dd className="font-semibold truncate">{d.lastOpenedAt ? arAgo(d.lastOpenedAt, now) : "—"}</dd></div>
          <div className="rounded-xl bg-white/[.03] px-2.5 py-2"><dt className="text-fg3">ينتهي</dt><dd className={`font-semibold truncate ${left <= 0 ? "text-[#ff8a8f]" : left <= 3 ? "text-[#ffcf70]" : ""}`}>{left <= 0 ? "خلص" : d.isSample ? "—" : `${arDate(d.expiresAt)}`}</dd></div>
        </dl>
        <div className="mt-auto flex items-center gap-2 relative">
          <Link href={`/studio/demos/${d.id}/share`} className="btn btn-primary btn-sm flex-1"><Icon name="share" size={15} />ابعت</Link>
          <Link href={`/studio/demos/${d.id}`} className="btn btn-ghost btn-sm"><Icon name="edit" size={15} />تعديل</Link>
          <button className="btn btn-ghost btn-sm px-2.5" aria-haspopup="menu" aria-expanded={menu} aria-label="أكتر" onClick={() => { setMenu((m) => !m); setConfirm(false); }}><Icon name="more" size={16} /></button>
          <AnimatePresence>
            {menu && (
              <motion.div role="menu" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className="absolute bottom-11 end-0 z-20 w-56 rounded-2xl border border-white/10 bg-ink-2 p-1.5 shadow-2xl"
                onKeyDown={(e) => { if (e.key === "Escape") setMenu(false); }}>
                {confirm ? (
                  <div className="p-2">
                    <p className="text-sm mb-2">تمسح «{d.name}» نهائي؟ الزيارات هتتمسح كمان.</p>
                    <div className="flex gap-2">
                      <button role="menuitem" autoFocus className="btn btn-danger btn-sm flex-1" onClick={() => { setMenu(false); onDelete(d); }}>امسح</button>
                      <button role="menuitem" className="btn btn-ghost btn-sm flex-1" onClick={() => setConfirm(false)}>لأ</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {isPublic && <MenuItem icon="link" onClick={async () => { await copyText(d.url); toast({ text: "اتنسخ اللينك ✓", tone: "ok" }); setMenu(false); }}>نسخ اللينك</MenuItem>}
                    <MenuItem icon="eye" onClick={() => { window.open(`/demo/${d.slug}?preview=1`, "_blank"); setMenu(false); }}>معاينة</MenuItem>
                    <MenuItem icon="copy" onClick={() => { onPatch(d, { action: "duplicate" }, "اتعمل نسخة"); setMenu(false); }}>تكرار</MenuItem>
                    <MenuItem icon="calendar" onClick={() => { onPatch(d, { action: "extend" }, "اتمدّت المدة"); setMenu(false); }}>مدّ المدة</MenuItem>
                    <MenuItem icon="archive" onClick={() => { onPatch(d, { archived: !d.archived }, d.archived ? "رجع من الأرشيف" : "اتأرشف"); setMenu(false); }}>{d.archived ? "رجّعه من الأرشيف" : "أرشفة"}</MenuItem>
                    <MenuItem icon="trash" danger onClick={() => setConfirm(true)}>حذف</MenuItem>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </article>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: string; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-start transition-colors ${danger ? "text-[#ff8a8f] hover:bg-[#E5484D]/10" : "hover:bg-white/[.06]"}`}>
      <Icon name={icon} size={16} />{children}
    </button>
  );
}
