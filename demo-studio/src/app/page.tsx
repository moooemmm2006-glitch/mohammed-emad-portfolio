import { redirect } from "next/navigation";
import { OWNER } from "@/lib/owner";

/** The studio app has no public home: send visitors to the portfolio. */
export default function Home() {
  redirect(OWNER.portfolioUrl);
}
