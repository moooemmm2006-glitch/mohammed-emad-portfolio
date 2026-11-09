"use client";
import { useState } from "react";
import { PRESET_KEYS, PRESET_LABEL, type Settings } from "@/lib/settings";
import { api } from "./api";
import { Icon } from "./Icon";
import { useToast } from "./StudioShell";

type Env = { telegram: boolean; blob: boolean; db: string; password: boolean; secret: boolean };

export function SettingsForm({ initial, env }: { initial: Settings; env: Env }) {
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [tg, setTg] = useState<"idle" | "busy">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ settings: Settings }>("/api/studio/settings", { method: "PUT", body: s });
      setS(r.settings);
      toast({ text: "اتحفظت الإعدادات ✓", tone: "ok" });
    } catch (er) { toast({ text: (er as Error).message, tone: "err" }); }
    setBusy(false);
  }
  async function testTelegram() {
    setTg("busy");
    try { await api("/api/studio/telegram-test", { body: {} }); toast({ text: "اتبعتت رسالة تجربة على تيليجرام ✓", tone: "ok" }); }
    catch (er) { toast({ text: (er as Error).message, tone: "err" }); }
    setTg("idle");
  }
  const checks: [string, boolean, string][] = [
    ["باسورد الاستوديو", env.password, "STUDIO_PASSWORD"],
    ["مفتاح التوقيع", env.secret, "AUTH_SECRET"],
    ["قاعدة البيانات (Turso)", env.db === "remote", env.db === "remote" ? "TURSO_DATABASE_URL" : env.db === "file" ? "ملف محلي (تطوير)" : "مؤقتة! ضيف TURSO_DATABASE_URL"],
    ["رفع الصور (Blob)", env.blob, "BLOB_READ_WRITE_TOKEN"],
    ["تنبيهات تيليجرام", env.telegram, "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID"],
  ];

  return (
    <form onSubmit={save} className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-semibold">الإعدادات</h1>
      <section className="card p-5 grid gap-4 sm:grid-cols-2">
        <label><span className="label">اسمك (في الرسائل)</span><input className="field" value={s.ownerName} onChange={(e) => setS({ ...s, ownerName: e.target.value })} /></label>
        <label><span className="label">واتساب بتاعك</span><input className="field text-end" dir="ltr" value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} /></label>
        <label><span className="label">رابط البورتفوليو</span><input className="field" dir="ltr" value={s.portfolioUrl} onChange={(e) => setS({ ...s, portfolioUrl: e.target.value })} /></label>
        <label><span className="label">مدة النموذج الافتراضية (أيام)</span><input className="field" type="number" min={1} max={90} value={s.defaultExpiryDays} onChange={(e) => setS({ ...s, defaultExpiryDays: Number(e.target.value) })} /></label>
      </section>
      <section className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">رسايل واتساب الجاهزة</h2>
          <p className="text-fg2 text-[13px]">استخدم <code dir="ltr">{"{name}"}</code> لاسم البيزنس و <code dir="ltr">{"{link}"}</code> للينك.</p>
        </div>
        {PRESET_KEYS.map((k) => (
          <label key={k} className="block"><span className="label">{PRESET_LABEL[k]}</span>
            <textarea className="field" rows={3} value={s.presets[k]} onChange={(e) => setS({ ...s, presets: { ...s.presets, [k]: e.target.value } })} />
          </label>
        ))}
      </section>
      <section className="card p-5">
        <h2 className="font-semibold mb-3">حالة الإعداد</h2>
        <ul className="space-y-2 text-sm">
          {checks.map(([l, ok, hint]) => (
            <li key={l} className="flex items-center gap-2">
              <span className={`grid size-5 place-items-center rounded-full ${ok ? "bg-[#0f3324] text-[#7ee2b0]" : "bg-[#3b2a0b] text-[#ffcf70]"}`}><Icon name={ok ? "check" : "x"} size={12} /></span>
              {l}<span className="text-fg3 text-[12.5px]" dir="ltr">{hint}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-ghost mt-4" onClick={testTelegram} disabled={tg === "busy"}><Icon name="bell" size={16} />{tg === "busy" ? "بيتبعت…" : "ابعت رسالة تجربة"}</button>
      </section>
      <button className="btn btn-primary" disabled={busy}>{busy ? "بيتحفظ…" : "احفظ"}</button>
    </form>
  );
}
