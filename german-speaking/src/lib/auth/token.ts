// Signed session tokens. Web Crypto only, so the same code runs in middleware (edge) and in API routes.

export const SESSION_COOKIE = "gs_session";
export const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
/** Without "remember me" the cookie lives until the browser closes, and the token for at most a day. */
export const SHORT_MS = 24 * 60 * 60 * 1000;

export interface TokenPayload {
  /** user id */
  u: string;
  /** users.token_version when issued */
  v: number;
  /** expiry, ms since epoch */
  e: number;
  /** 1 when "remember me" was ticked (kept when the cookie is re-issued) */
  r?: 1;
}

export class AuthConfigError extends Error {}

const DEV_SECRET = "german-speaking-dev-secret-change-me";

export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  // On Vercel a missing secret is a configuration error; locally a fixed dev secret is fine.
  if (process.env.VERCEL) throw new AuthConfigError("AUTH_SECRET is missing or shorter than 16 characters");
  return DEV_SECRET;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** Length-independent comparison so the check doesn't leak how much of the signature matched. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function signToken(p: TokenPayload, secret = authSecret()): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(p)));
  return `${body}.${b64url(await hmac(body, secret))}`;
}

/** The payload if the signature is valid and the token hasn't expired; otherwise null. */
export async function verifyToken(token: string | undefined, secret = authSecret(), now = Date.now()): Promise<TokenPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (!safeEqual(sig, b64url(await hmac(body, secret)))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body))) as TokenPayload;
    if (typeof p.u !== "string" || typeof p.v !== "number" || typeof p.e !== "number" || p.e < now) return null;
    return p;
  } catch {
    return null;
  }
}
