import { jsonError } from "../api";
import { AuthConfigError } from "./token";
import { AuthError } from "./users";

/** Turn auth failures into JSON errors the browser translates by code. */
export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    // For rate limiting, the message is the number of minutes to wait.
    const res = jsonError(err.status, err.code, err.retryAfterSec ? String(Math.ceil(err.retryAfterSec / 60)) : err.code);
    if (err.retryAfterSec) res.headers.set("Retry-After", String(err.retryAfterSec));
    return res;
  }
  if (err instanceof AuthConfigError) {
    console.error("[auth]", err.message);
    return jsonError(500, "auth_not_configured", "AUTH_SECRET is not set on the server");
  }
  console.error("[auth] failed:", err instanceof Error ? err.message : "unknown error");
  return jsonError(500, "server_error", "Something went wrong");
}
