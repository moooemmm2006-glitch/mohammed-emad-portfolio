"use client";
import Link from "next/link";
import { useState } from "react";
import { csvToLeads, type LeadRow } from "@/lib/csv";
import { NICHE_LABEL, NICHE_SHORT, NICHES, STYLE_LABEL, STYLES, type Niche, type Style } from "@/lib/demo/model";
import { api } from "./api";
import { Icon } from "./Icon";
import { useToast } from "./StudioShell";

const SAMPLE = "name,type,area,phone,link,notes\nEnglish Dose,سنتر انجليزي,مدينة نصر,01012345678,https://maps.app.goo.gl/xxxx,كلّمت السكرتيرة\nعيادة د. أحمد للأسنان,عيادة أسنان,المعادي,01112345678,,\n";

export function CsvImport() {
  const toast = useToast();
  const [rows, setRows] = useState<(LeadRow & { pick: boolean })[]>([]);
  const [styles, setStyles] = useState<Record<Niche, Style>>({ courses: "bold", clinic: "calm", shop: "bold" });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [paste, setPaste] = useState("");

  function load(text: string) {
    const { leads } = csvToLeads(text);
    if (!leads.length) { toast({ text: "الملف فاضي أو مش CSV", tone: "err" }); return; }
    setRows(leads.map((l) => ({ ...l, pick: !l.error || l.error !== "مفيش اسم" })));
    setCreated([]);
  }
  const set = (i: number, p: Partial<LeadRow & { pick: boolean }>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const ready = rows.filter((r) => r.pick && r.name && r.niche);

  async function createAll() {
    setBusy(true);
    try {
      const r = await api<{ created: typeof created }>("/api/studio/import", { body: { styles, rows: ready.map(({ name, niche, area, phone, mapsUrl, instagram, notes }) => ({ name, niche, area, phone, mapsUrl, instagram, notes })) } });
      setCreated(r.created);
      setRows([]);
      toast({ text: `اتعمل ${r.created.length} نموذج ✓`, tone: "ok" });
    } catch (e) { toast({ text: (e as Error).message, tone: "err" }); }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">استيراد من CSV</h1>
        <p className="text-fg2 text-sm mt-1">نفس أعمدة شيت الليدز: <code dir="ltr" className="text-ivory">name, type, area, phone, link, notes</code>. كل صف بيبقى مسودة بالمحتوى الافتراضي، وبعدين تظبطهم واحد واحد.</p>
      </div>

      {created.length > 0 && (
        <section className="card p-5 border-[#7ee2b0]/30">
          <h2 className="font-semibold mb-3">اتعملوا ✓ — دوس على أي واحد تظبطه</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {created.map((c) => <li key={c.id}><Link href={`/studio/demos/${c.id}`} className="flex items-center justify-between rounded-xl bg-white/[.04] px-3 py-2.5 hover:bg-white/[.08]">{c.name}<Icon name="arrow" size={15} /></Link></li>)}
          </ul>
        </section>
      )}

      {!rows.length && (
        <section className="card p-5 grid gap-4 md:grid-cols-2">
          <label className="grid min-h-[180px] cursor-pointer place-items-center rounded-2xl border border-dashed border-white/15 text-center hover:border-white/30 transition">
            <span><Icon name="upload" size={28} className="mx-auto mb-2 text-fg2" /><span className="block font-semibold">ارفع ملف CSV</span><span className="text-fg3 text-[13px]">من Google Sheets: ملف ← تنزيل ← CSV</span></span>
            <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); e.target.value = ""; }} />
          </label>
          <div>
            <label htmlFor="csv-paste" className="label">أو الصق الصفوف هنا</label>
            <textarea id="csv-paste" className="field font-mono text-[13px]" dir="ltr" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={SAMPLE} />
            <div className="mt-2 flex gap-2">
              <button className="btn btn-primary btn-sm" disabled={!paste.trim()} onClick={() => load(paste)}>اعرض الصفوف</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPaste(SAMPLE)}>مثال</button>
            </div>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <>
          <section className="card p-5">
            <h2 className="font-semibold mb-3">الستايل لكل نوع</h2>
            <div className="flex flex-wrap gap-4">
              {NICHES.map((n) => (
                <label key={n} className="flex items-center gap-2 text-sm">{NICHE_SHORT[n]}
                  <select className="field py-1.5 w-auto" value={styles[n]} onChange={(e) => setStyles((s) => ({ ...s, [n]: e.target.value as Style }))}>
                    {STYLES.map((s) => <option key={s} value={s}>{STYLE_LABEL[s]}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>
          <section className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-fg2 text-start">
                <tr className="border-b border-white/[.06]">
                  <th className="p-3 text-start w-10"><input type="checkbox" aria-label="اختار الكل" className="accent-[#2E5BFF]" checked={rows.every((r) => r.pick)} onChange={(e) => setRows((rs) => rs.map((r) => ({ ...r, pick: e.target.checked })))} /></th>
                  {["الاسم", "النوع", "المنطقة", "الرقم", "ملاحظات"].map((h) => <th key={h} className="p-3 text-start font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-b border-white/[.04] ${r.pick ? "" : "opacity-50"}`}>
                    <td className="p-3"><input type="checkbox" className="accent-[#2E5BFF]" aria-label={`اختار ${r.name}`} checked={r.pick} onChange={(e) => set(i, { pick: e.target.checked })} /></td>
                    <td className="p-3"><input className="field py-1.5" value={r.name} onChange={(e) => set(i, { name: e.target.value })} aria-label="الاسم" />{r.error && <span className="block text-[12px] text-[#ffcf70] mt-1">{r.error}</span>}</td>
                    <td className="p-3">
                      <select className={`field py-1.5 ${r.niche ? "" : "border-[#ffcf70]/60"}`} value={r.niche || ""} aria-label="النوع" onChange={(e) => set(i, { niche: (e.target.value || null) as Niche | null })}>
                        <option value="">اختار…</option>
                        {NICHES.map((n) => <option key={n} value={n}>{NICHE_LABEL[n]}</option>)}
                      </select>
                      {r.type && <span className="block text-[12px] text-fg3 mt-1">{r.type}</span>}
                    </td>
                    <td className="p-3">{r.area || "—"}</td>
                    <td className="p-3" dir="ltr">{r.phone || "—"}</td>
                    <td className="p-3 text-fg2 max-w-[200px] truncate">{r.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" disabled={busy || !ready.length} onClick={createAll}><Icon name="sparkles" size={16} />{busy ? "بيتعمل…" : `اعمل ${ready.length} نموذج`}</button>
            <button className="btn btn-ghost" onClick={() => setRows([])}>إلغاء</button>
            {rows.some((r) => r.pick && !r.niche) && <span className="text-[13px] text-[#ffcf70]">فيه صفوف محتاجة تختار نوعها</span>}
          </div>
        </>
      )}
    </div>
  );
}
