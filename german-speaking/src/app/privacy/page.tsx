import type { Metadata } from "next";
import { PrivacyPage } from "@/components/public/InfoPages";

export const metadata: Metadata = { title: "سياسة الخصوصية", alternates: { canonical: "/privacy" } };

export default function Page() {
  return <PrivacyPage />;
}
