import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/owner";
import { listDemos } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Only real sites (/s/…) are listed. Demos are never in the sitemap. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const list = await listDemos().catch(() => []);
  return list.filter((d) => d.siteLive && !d.archived).map((d) => ({ url: `${siteUrl()}/s/${d.slug}`, lastModified: new Date(d.updatedAt) }));
}
