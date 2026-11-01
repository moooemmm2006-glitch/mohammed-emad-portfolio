import type { Metadata } from "next";
import { AboutPage } from "@/components/public/InfoPages";

export const metadata: Metadata = { title: "عن Sprich Deutsch", alternates: { canonical: "/about" } };

export default function Page() {
  return <AboutPage />;
}
