// Optional single-password gate for public deployments (set APP_PASSWORD).
// Runs in middleware (edge) and in the login route, so it only uses Web Crypto.

export const AUTH_COOKIE = "gs_auth";

export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`german-speaking:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Length-independent comparison so the check doesn't leak how much of the token matched. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
