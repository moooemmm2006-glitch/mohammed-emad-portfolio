import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { verifyExportToken } from "@/lib/auth";
import { siteUrl } from "@/lib/owner";
import { getDemoBySlug, getSettings } from "@/lib/repo";
import { isStudio } from "@/lib/session";
import { Template } from "@/templates/Template";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };
const load = cache(async (slug: string) => getDemoBySlug(slug.toLowerCase()));

/** The production copy of a demo: no demo bar, indexable, real forms. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d || !d.siteLive || d.archived) return { robots: { index: false } };
  const c = d.content;
  const url = `${siteUrl()}/s/${d.slug}`;
  const og = `${siteUrl()}/api/og/${d.slug}?site=1&v=${d.updatedAt}`;
  return {
    title: c.tagline ? `${c.name} | ${c.tagline}` : c.name,
    description: c.intro || c.tagline || c.name,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { type: "website", title: c.name, description: c.tagline, url, siteName: c.name, locale: "ar_EG", images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: c.name, description: c.tagline, images: [og] },
  };
}

export default async function SitePage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const d = await load(slug);
  if (!d) notFound();
  const exporting = await verifyExportToken(d.slug, sp.export);
  if (!exporting && (!d.siteLive || d.archived) && !(await isStudio())) notFound();
  const settings = await getSettings();
  return <Template content={d.content} slug={d.slug} mode={exporting ? "export" : "site"} ownerWhatsapp={settings.whatsapp} />;
}
