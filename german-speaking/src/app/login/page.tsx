"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { IconMic } from "@/components/Icons";
import { useUI } from "@/lib/client/ui";

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const { t } = useUI();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/");
    else setError(true);
  };

  return (
    <form onSubmit={submit} className="card max-w-sm mx-auto mt-16 p-6 space-y-4">
      <span className="grid place-items-center w-12 h-12 rounded-2xl bg-brand text-brand-ink">
        <IconMic />
      </span>
      <h1 className="text-xl font-bold">{t("login_title")}</h1>
      <p className="text-sm text-muted">{t("login_body")}</p>
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3"
        aria-label={t("login_password")}
        placeholder={t("login_password")}
        dir="ltr"
        autoFocus
      />
      {error && (
        <p role="alert" className="text-danger text-sm">
          {t("login_wrong")}
        </p>
      )}
      <button className="btn btn-primary w-full" disabled={busy || !password}>
        {t("login_enter")}
      </button>
    </form>
  );
}
