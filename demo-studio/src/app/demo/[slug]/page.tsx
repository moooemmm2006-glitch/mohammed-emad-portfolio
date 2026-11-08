import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { Expired } from "@/components/demo/Expired";
import { PhoneFrame } from "@/components/demo/PhoneFrame";
import { Tracker } from "@/components/demo/Tracker";
import { NICHE_SHORT } from "@/lib/demo/model";
import { arDate, isExpired } from "@/lib/expiry";
import { siteUrl } from "@/lib/owner";
import { getDemoBySlug, getSettings, isPublic } from "@/lib/repo";
import { isStudio } from "@/lib/session";
import { Template } from "@/templates/Template";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

const load = cache(async (slug: string) => getDemoBySlug(slug.toLowerCase()));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  const robots = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };
  if (!d || !isPublic(d)) return { title: "نموذج موقع", robots };
  const title = `${d.name} — نموذج موقع خاص بيكم`;
  const description = d.content.tagline || `نموذج موقع ${NICHE_SHORT[d.content.niche]} اتعمل مخصوص لـ ${d.name}`;
  const og = `${siteUrl()}/api/og/${d.slug}?v=${d.updatedAt}`;
  return {
    title,
    description,
    robots,
    openGraph: { type: "website", title, description, url: `${siteUrl()}/demo/${d.slug}`, siteName: "ME Web", locale: "ar_EG", images: [{ url: og, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

export default async function DemoPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [d, studio, settings] = await Promise.all([load(slug), isStudio(), getSettings()]);
  if (!d) notFound();
  // Drafts, requests and archived demos are visible to the studio only.
  if (!isPublic(d) && !studio) notFound();
  if (isExpired(d.expiresAt) && !studio) return <Expired name={d.name} ownerWhatsapp={settings.whatsapp} portfolioUrl={settings.portfolioUrl} />;

  const preview = sp.preview === "1" || studio;
  if (sp.frame === "phone") {
    const q = new URLSearchParams({ embed: "1", ...(sp.preview === "1" ? { preview: "1" } : {}) });
    return <PhoneFrame src={`/demo/${d.slug}?${q}`} name={d.name} />;
  }

  return (
    <Template content={d.content} slug={d.slug} mode="demo" ownerWhatsapp={settings.whatsapp}>
      <DemoBar name={d.name} ownerName={settings.ownerName === "محمد" ? "محمد عماد" : settings.ownerName} ownerWhatsapp={settings.whatsapp} portfolioUrl={settings.portfolioUrl} until={arDate(d.expiresAt)} />
      <Tracker slug={d.slug} enabled={!preview} />
    </Template>
  );
}
