import type { Metadata } from "next";
import { cookies } from "next/headers";
import { HomePage } from "@/components/home/HomePage";
import { Landing } from "@/components/public/Landing";
import { currentUser } from "@/lib/auth/session";
import { isLevel } from "@/lib/levels";
import { LEVEL_COOKIE } from "@/lib/paths";
import { publicSiteReviews } from "@/lib/publicReviews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Sprich Deutsch – اتكلم ألماني من A1 لحد B2" } };

// 🏠 "/": visitors get the public landing page; logged-in learners get their own home.
export default async function Home() {
  const user = await currentUser().catch(() => null);
  if (!user) return <Landing reviews={await publicSiteReviews(6)} />;
  const last = (await cookies()).get(LEVEL_COOKIE)?.value?.toUpperCase();
  return <HomePage lastLevel={isLevel(last) ? last : null} />;
}
