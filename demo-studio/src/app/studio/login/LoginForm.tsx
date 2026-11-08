"use client";
import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/studio/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) {
      window.location.href = next;
      return;
    }
    const j = await res.json().catch(() => ({}));
    setErr(j.error || "حصلت مشكلة، جرّب تاني");
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="pw" className="label">الباسورد</label>
        <input id="pw" type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" dir="ltr" />
      </div>
      {err && <p role="alert" className="text-sm text-[#ff8a8f]">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !pw}>{busy ? "ثانية…" : "دخول"}</button>
    </form>
  );
}
