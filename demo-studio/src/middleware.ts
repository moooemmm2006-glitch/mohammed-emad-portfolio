import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

/** Every /studio page and /api/studio route needs the signed session cookie. */
/** CUSTOM_DOMAINS="englishdose.com=english-dose,www.englishdose.com=english-dose" → that host shows /s/<slug>. */
function customDomainSlug(host: string): string | null {
  const map = process.env.CUSTOM_DOMAINS || "";
  for (const pair of map.split(",")) {
    const [h, slug] = pair.split("=").map((x) => x?.trim().toLowerCase());
    if (h && slug && h === host) return slug;
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const slug = customDomainSlug((req.headers.get("host") || "").split(":")[0].toLowerCase());
  if (slug) {
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = `/s/${slug}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }
  if (pathname === "/") return NextResponse.next();
  if (pathname === "/studio/login" || pathname === "/api/studio/login") return NextResponse.next();
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "لازم تسجّل دخول الأول" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/studio/login";
  url.search = pathname === "/studio" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/", "/studio", "/studio/:path*", "/api/studio/:path*"] };
