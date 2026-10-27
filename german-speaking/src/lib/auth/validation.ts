// Shared by the sign-up form and the API, so both give the same (translated) errors.

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;
export const NAME_MAX = 60;

export type FieldError =
  | "name_required"
  | "name_too_long"
  | "username_invalid"
  | "password_short"
  | "password_long"
  | "password_mismatch";

export function normalizeUsername(u: string): string {
  return u.trim().toLowerCase();
}

export function checkName(name: string): FieldError | null {
  const n = name.trim();
  if (!n) return "name_required";
  if (n.length > NAME_MAX) return "name_too_long";
  return null;
}

export function checkUsername(u: string): FieldError | null {
  return USERNAME_RE.test(normalizeUsername(u)) ? null : "username_invalid";
}

export function checkPassword(p: string, confirm?: string): FieldError | null {
  if (p.length < PASSWORD_MIN) return "password_short";
  if (p.length > PASSWORD_MAX) return "password_long";
  if (confirm !== undefined && confirm !== p) return "password_mismatch";
  return null;
}
