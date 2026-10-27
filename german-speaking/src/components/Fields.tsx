"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { useUI } from "@/lib/client/ui";
import { IconEye, IconEyeOff } from "./Icons";

type FieldProps = { label: string; hint?: string; error?: string | null } & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, hint, error, ...input }: FieldProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input id={id} className="field" aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${id}-d` : undefined} {...input} />
      <FieldNote id={`${id}-d`} hint={hint} error={error} />
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField({ label, hint, error, ...input }: FieldProps) {
  const { t } = useUI();
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          className="field !pe-12"
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${id}-d` : undefined}
          {...input}
        />
        <button
          type="button"
          className="absolute inset-y-0 end-0 px-3 grid place-items-center text-muted hover:text-ink"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t("auth_hide") : t("auth_show")}
          aria-pressed={show}
        >
          {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      </div>
      <FieldNote id={`${id}-d`} hint={hint} error={error} />
    </div>
  );
}

function FieldNote({ id, hint, error }: { id: string; hint?: string; error?: string | null }) {
  if (error) {
    return (
      <p id={id} className="text-xs text-danger">
        {error}
      </p>
    );
  }
  return hint ? (
    <p id={id} className="text-xs text-muted">
      {hint}
    </p>
  ) : null;
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 text-danger px-3 py-2 text-sm">
      {children}
    </p>
  );
}
