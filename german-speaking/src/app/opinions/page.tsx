"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LevelReviews } from "@/components/level/LevelReviews";
import { useUI } from "@/lib/client/ui";
import { isLevel, LEVEL_CONFIG, LEVELS, type Level } from "@/lib/levels";

// 💬 All learners' opinions in one place: pick a level, read the reel, write your own.

export default function OpinionsPage() {
  return (
    <Suspense>
      <Opinions />
    </Suspense>
  );
}

function Opinions() {
  const { t } = useUI();
  const router = useRouter();
  const q = useSearchParams().get("level")?.toUpperCase();
  const level: Level = isLevel(q) ? q : "A1";
  return (
    <div className="max-w-5xl mx-auto space-y-5" data-testid="opinions-page">
      <header>
        <h1 className="text-3xl sm:text-4xl font-extrabold">💬 {t("lrev_page_title")}</h1>
        <p className="mt-2 text-muted">{t("lrev_page_sub")}</p>
      </header>
      <div role="tablist" aria-label={t("header_level")} className="grid grid-cols-4 gap-1 sm:gap-2 rounded-2xl bg-surface-2/80 p-1 max-w-md">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={l === level}
            className={`rounded-xl py-2.5 font-extrabold transition ${l === level ? "bg-surface depth" : "text-muted hover:text-ink"}`}
            style={l === level ? { color: LEVEL_CONFIG[l].accent } : undefined}
            onClick={() => router.replace(`/opinions?level=${l}`, { scroll: false })}
          >
            {l}
          </button>
        ))}
      </div>
      <LevelReviews key={level} level={level} />
    </div>
  );
}
