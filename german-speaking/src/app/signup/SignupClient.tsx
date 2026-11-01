"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FormError, PasswordField, TextField } from "@/components/Fields";
import { IconCamera } from "@/components/Icons";
import { PHOTO_ACCEPT, PhotoCropper, checkPhotoFile } from "@/components/PhotoCropper";
import { uploadPhoto } from "@/components/ProfileMenu";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/client/api";
import { authErrorText, safeNext } from "@/lib/client/me";
import type { TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { checkName, checkPassword, checkUsername, normalizeUsername, type FieldError } from "@/lib/auth/validation";

export default function SignupPageWrapper() {
  return (
    <Suspense>
      <SignupPage />
    </Suspense>
  );
}

const errKey = (e: FieldError | null) => (e ? (`autherr_${e}` as TKey) : null);

function SignupPage() {
  const { t } = useUI();
  const next = safeNext(useSearchParams().get("next"));
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(true);
  const [pick, setPick] = useState<File | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Field errors show after the first submit attempt (or as soon as a field has content).
  const fieldErr = {
    name: touched || name ? errKey(checkName(name)) : null,
    username: touched || username ? errKey(checkUsername(username)) : null,
    password: touched || password ? errKey(checkPassword(password)) : null,
    confirm: touched || confirm ? errKey(confirm === password ? null : "password_mismatch") : null,
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (checkName(name) || checkUsername(username) || checkPassword(password, confirm)) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, username: normalizeUsername(username), password, confirm, remember }) });
      // The account exists now; a failed photo upload can be retried from the profile menu.
      if (photo) await uploadPhoto(photo).catch(() => null);
      location.href = next;
    } catch (err) {
      setError(authErrorText(err, t));
      setBusy(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const err = checkPhotoFile(f);
    if (err) return setError(t(err));
    setError(null);
    setPick(f);
  };

  return (
    <form onSubmit={submit} className="card max-w-md mx-auto mt-6 sm:mt-10 p-6 space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-bold">{t("auth_signup_title")}</h1>
        <p className="text-sm text-muted mt-1">{t("auth_signup_sub")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            <img src={preview} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <UserAvatar name={name} username={username || "?"} photo={null} size={64} />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{t("auth_photo")}</p>
          <div className="flex gap-2">
            <label className="btn btn-ghost !min-h-[36px] !py-1 text-sm cursor-pointer">
              <IconCamera size={16} /> {t("auth_photo_pick")}
              <input type="file" accept={PHOTO_ACCEPT} className="sr-only" onChange={onFile} />
            </label>
            {photo && (
              <button type="button" className="btn btn-ghost !min-h-[36px] !py-1 text-sm" onClick={() => setPhoto(null)}>
                {t("me_remove_photo")}
              </button>
            )}
          </div>
        </div>
      </div>

      <TextField label={t("auth_name")} placeholder={t("auth_name_ph")} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" error={fieldErr.name && t(fieldErr.name)} required />
      <TextField
        label={t("auth_username")}
        hint={t("auth_username_hint")}
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
        maxLength={20}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        dir="ltr"
        error={fieldErr.username && t(fieldErr.username)}
        required
      />
      <PasswordField label={t("auth_password")} hint={t("auth_password_hint")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" error={fieldErr.password && t(fieldErr.password)} required />
      <PasswordField label={t("auth_confirm")} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" error={fieldErr.confirm && t(fieldErr.confirm)} required />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[var(--brand)]" />
        {t("auth_remember")}
      </label>
      <FormError>{error}</FormError>
      <button className="btn btn-primary w-full" disabled={busy}>
        {t("auth_submit_signup")}
      </button>
      <p className="text-sm text-center text-muted">
        {t("auth_have_account")}{" "}
        <Link href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="inline-block py-2 px-1 font-semibold text-ink underline">
          {t("auth_go_login")}
        </Link>
      </p>

      {pick && (
        <PhotoCropper
          file={pick}
          onCancel={() => setPick(null)}
          onDone={(b) => {
            setPhoto(b);
            setPick(null);
          }}
        />
      )}
    </form>
  );
}
