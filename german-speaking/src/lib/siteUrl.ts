// The site's public address (for search engines): SITE_URL if set, else Vercel's production domain.
export function siteUrl(): string {
  const env = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return (env || "http://localhost:3000").replace(/\/+$/, "");
}
