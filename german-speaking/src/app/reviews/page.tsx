import type { Metadata } from "next";
import { PublicReviewsPage } from "@/components/reviews/PublicReviews";
import { jsonLdString, publicSiteReviews, reviewsJsonLd } from "@/lib/publicReviews";

// ⭐ "الريفيوز" — open to everyone and to search engines (see middleware): approved opinions only.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الريفيوز – Sprich Deutsch",
  description: "Was Lernende über Sprich Deutsch sagen – echte Bewertungen von A1 bis B2. آراء الطلاب الحقيقية في Sprich Deutsch.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const data = await publicSiteReviews();
  const ld = reviewsJsonLd(data);
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />}
      <PublicReviewsPage data={data} />
    </>
  );
}
