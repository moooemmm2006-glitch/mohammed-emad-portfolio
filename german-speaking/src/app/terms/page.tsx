import type { Metadata } from "next";
import { TermsPage } from "@/components/public/InfoPages";

export const metadata: Metadata = { title: "شروط الاستخدام", alternates: { canonical: "/terms" } };

export default function Page() {
  return <TermsPage />;
}
