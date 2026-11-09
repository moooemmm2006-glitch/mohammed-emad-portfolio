/**
 * Defaults read from the portfolio (data/site.js + css/style.css). The studio settings page can
 * override them at runtime; these are only the starting values.
 */
export const OWNER = {
  name: "محمد عماد",
  brand: "ME Web",
  whatsapp: "201105684641",
  whatsappDisplay: "+20 110 568 4641",
  email: "mohammed.emad.official110@gmail.com",
  portfolioUrl: "https://mohammed-emad-portfolio.vercel.app",
  instagram: "https://www.instagram.com/me.web.design/",
} as const;

/** Portfolio design tokens (css/style.css :root). */
export const BRAND = {
  ink: "#0B0D12",
  ink1: "#0F1218",
  ink2: "#141821",
  ink3: "#1C212C",
  ivory: "#F4F1EA",
  cobalt: "#2E5BFF",
  cobalt2: "#4A72FF",
} as const;

/** Public base URL used in share links, QR codes and OG tags. */
export function siteUrl(): string {
  // Links are shared from the portfolio domain (vercel.json rewrites); localhost in development.
  const v = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL ? OWNER.portfolioUrl : "http://localhost:3100");
  return v.replace(/\/+$/, "");
}
