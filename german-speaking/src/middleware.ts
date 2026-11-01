import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "./lib/auth/token";

// Every page and API route needs a valid signed session cookie, except the login and sign-up
// pages and their API. This only checks the signature; API routes also load the user, so a
// disabled account or a changed password is rejected there.

const PUBLIC_PAGES = ["/login", "/signup"];
// Open to everyone (and to search engines): the reviews page, which shows only opinions the admin
// approved (first name, stars, text) — nothing else.
const OPEN_PAGES = ["/reviews"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);

  if (OPEN_PAGES.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PAGES.includes(pathname)) {
    // Already logged in → no need to see the login form again.
    if (session) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Login required" } }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api/auth/|_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|logos/).*)"],
};
