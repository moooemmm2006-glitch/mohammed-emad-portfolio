import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

// Search engines may read the public pages (reviews, login, sign-up); everything else needs an account.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/$", "/reviews", "/about", "/faq", "/privacy", "/terms", "/login", "/signup"], disallow: ["/api/", "/admin"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
