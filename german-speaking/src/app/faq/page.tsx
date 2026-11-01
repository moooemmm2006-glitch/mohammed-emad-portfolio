import type { Metadata } from "next";
import { FaqPage } from "@/components/public/InfoPages";

export const metadata: Metadata = { title: "الأسئلة الشائعة", alternates: { canonical: "/faq" } };

export default function Page() {
  return <FaqPage />;
}
