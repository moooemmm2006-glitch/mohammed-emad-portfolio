import SignupPageWrapper from "./SignupClient";
import { ReviewsStrip } from "@/components/reviews/PublicReviews";
import { publicSiteReviews } from "@/lib/publicReviews";

export const dynamic = "force-dynamic";

// The form, and under it what other learners say (approved reviews only).
export default async function Page() {
  const data = await publicSiteReviews(6);
  return (
    <>
      <SignupPageWrapper />
      <ReviewsStrip data={data} />
    </>
  );
}
