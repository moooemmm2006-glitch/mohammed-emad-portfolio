import LoginPageWrapper from "./LoginClient";
import { ReviewsStrip } from "@/components/reviews/PublicReviews";
import { publicSiteReviews } from "@/lib/publicReviews";

export const dynamic = "force-dynamic";

// The form, and under it what other learners say (approved reviews only).
export default async function Page() {
  const data = await publicSiteReviews(6);
  return (
    <>
      <LoginPageWrapper />
      <ReviewsStrip data={data} />
    </>
  );
}
