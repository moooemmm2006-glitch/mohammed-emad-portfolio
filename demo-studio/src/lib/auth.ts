/** Studio session: an httpOnly cookie "<expiry>.<hmac>" signed with AUTH_SECRET (Web Crypto, edge-safe). */
export const SESSION_COOKIE = "ds_session";
export const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET || "";
  if (s.length >= 16) return s;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) throw new Error("AUTH_SECRET is missing");
  return "dev-only-secret-change-me-please";
}

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const exp = now + SESSION_DAYS * 86_400_000;
  return `${exp}.${await hmac(`studio:${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined | null, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < now) return false;
  return safeEqual(sig, await hmac(`studio:${exp}`));
}

/** Constant-time password check (both sides hashed so lengths match). */
export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.STUDIO_PASSWORD || (process.env.NODE_ENV !== "production" ? "studio" : "");
  if (!expected) return false;
  const [a, b] = await Promise.all([hmac(`pw:${input}`), hmac(`pw:${expected}`)]);
  return safeEqual(a, b);
}

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Visitor fingerprint for dedupe: hashed IP + UA + day + secret. The raw IP is never stored. */
export async function visitorHash(ip: string, ua: string, day: string): Promise<string> {
  return (await hmac(`v:${ip}|${ua}|${day}`)).slice(0, 32);
}
