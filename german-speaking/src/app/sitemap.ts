import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/reviews`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
