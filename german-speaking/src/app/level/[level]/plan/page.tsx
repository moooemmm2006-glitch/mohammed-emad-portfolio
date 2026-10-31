"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LevelPlan } from "@/components/plan/LevelPlan";
import { useUI } from "@/lib/client/ui";
import { isLevel } from "@/lib/levels";

// 🗺️ /level/a1/plan — the level's study plan.
export default function PlanPage() {
  const { t } = useUI();
  const level = useParams<{ level: string }>().level?.toUpperCase();
  if (!isLevel(level))
    return (
      <p className="py-20 text-center">
        <Link href="/" className="btn btn-primary">
          {t("back")}
        </Link>
      </p>
    );
  return <LevelPlan level={level} />;
}
