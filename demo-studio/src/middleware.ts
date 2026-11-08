import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

/** Every /studio page and /api/studio route needs the signed session cookie. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/studio/login" || pathname === "/api/studio/login") return NextResponse.next();
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "لازم تسجّل دخول الأول" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/studio/login";
  url.search = pathname === "/studio" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/studio", "/studio/:path*", "/api/studio/:path*"] };
