import { approvedLevelReviews, SITE_REVIEW } from "@/lib/levelReviews";
import { siteUrl } from "@/lib/siteUrl";

// ⭐ The public side of the reviews: only opinions of the site the admin approved, with first names.
// Used by the open /reviews page, the login / sign-up pages and the structured data for Google.

export type PublicReviews = Awaited<ReturnType<typeof approvedLevelReviews>>;

export async function publicSiteReviews(limit = 40): Promise<PublicReviews> {
  try {
    return await approvedLevelReviews(SITE_REVIEW, limit);
  } catch {
    return { average: null, count: 0, reviews: [] };
  }
}

/** schema.org data so search engines can see the rating (only when there are real reviews). */
export function reviewsJsonLd(data: PublicReviews) {
  if (!data.count || data.average == null) return null;
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Sprich Deutsch – Deutsch lernen A1 bis B2",
    description: "Deutsch sprechen lernen von A1 bis B2: Sätze nachsprechen, Grammatik, Videos, Lesen, Schreiben und ein Lernplan.",
    url: `${url}/reviews`,
    inLanguage: "de",
    provider: { "@type": "Organization", name: "Sprich Deutsch", url },
    aggregateRating: { "@type": "AggregateRating", ratingValue: data.average, reviewCount: data.count, bestRating: 5, worstRating: 1 },
    review: data.reviews.slice(0, 10).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name },
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      reviewBody: r.comment,
      datePublished: new Date(r.at).toISOString().slice(0, 10),
    })),
  };
}

/** Safe to put inside <script type="application/ld+json">. */
export const jsonLdString = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
