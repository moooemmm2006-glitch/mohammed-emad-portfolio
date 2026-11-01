"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FormError, PasswordField, TextField } from "@/components/Fields";
import { IconMic } from "@/components/Icons";
import { api } from "@/lib/client/api";
import { authErrorText, safeNext } from "@/lib/client/me";
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
  const next = safeNext(useSearchParams().get("next"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password, remember }) });
      // Full navigation so every page reloads with the new account.
      location.href = next;
    } catch (err) {
      setError(authErrorText(err, t));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card max-w-sm mx-auto mt-6 sm:mt-12 p-6 space-y-4" noValidate>
      <span className="grid place-items-center w-12 h-12 rounded-2xl bg-brand text-brand-ink">
        <IconMic />
      </span>
      <div>
        <h1 className="text-2xl font-bold">{t("auth_login_title")}</h1>
        <p className="text-sm text-muted mt-1">{t("auth_login_sub")}</p>
      </div>
      <TextField
        label={t("auth_username")}
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase())}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        dir="ltr"
        required
        autoFocus
      />
      <PasswordField label={t("auth_password")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[var(--brand)]" />
        {t("auth_remember")}
      </label>
      <FormError>{error}</FormError>
      <button className="btn btn-primary w-full" disabled={busy || !username || !password}>
        {t("auth_submit_login")}
      </button>
      <p className="text-sm text-center text-muted">
        {t("auth_no_account")}{" "}
        <Link href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="inline-block py-2 px-1 font-semibold text-ink underline">
          {t("auth_go_signup")}
        </Link>
      </p>
    </form>
  );
}
