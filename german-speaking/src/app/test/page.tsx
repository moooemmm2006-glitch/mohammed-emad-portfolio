import type { Metadata } from "next";
import { PlacementTest } from "@/components/public/PlacementTest";

export const metadata: Metadata = { title: "اختبار تحديد المستوى", description: "Einstufungstest Deutsch A1–B2: 20 Fragen, 5 Minuten – اعرف مستواك في الألماني.", alternates: { canonical: "/test" } };

export default function Page() {
  return <PlacementTest />;
}
