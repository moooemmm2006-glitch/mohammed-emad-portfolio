"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Shadowing } from "@/components/book/Shadowing";
import { IconArrow } from "@/components/Icons";
import { api, useProviders, useSettings } from "@/lib/client/api";
import { fill } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { isLevel, type Level } from "@/lib/levels";

interface DueItem {
  n: number;
  topic: number;
  level: Level;
  de: string;
  ar: string;
  best: number;
}

export default function ReviewPageWrapper() {
  return (
    <Suspense>
      <ReviewPage />
    </Suspense>
  );
}

// "مراجعة النهارده": the sentences said wrong before that are due today (1 day → 3 days → a week).
function ReviewPage() {
  const { t } = useUI();
  const only = useSearchParams().get("level")?.toUpperCase();
  const { settings } = useSettings();
  const providers = useProviders();
  const [items, setItems] = useState<DueItem[] | null>(null);

  useEffect(() => {
    api<{ items: DueItem[] }>("/api/book/review").then(
      (d) => setItems(d.items.filter((x) => !isLevel(only) || x.level === only)),
      () => setItems([]),
    );
  }, [only]);

  if (!items || !settings || !providers) return <p className="py-20 text-center text-muted">{t("loading")}</p>;
  const level: Level = isLevel(only) ? only : (items[0]?.level ?? "A1");
  const topics = [...new Set(items.map((x) => x.topic))];

  return (
    <div className={`level-${level.toLowerCase()} max-w-3xl mx-auto space-y-5`}>
      <Link href={isLevel(only) ? `/speak/${only}` : "/speak"} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink min-h-[40px] -my-2 pe-3">
        <IconArrow size={16} className="rotate-180 rtl:rotate-0" /> {t("back")}
      </Link>
      <header>
        <h1 className="text-2xl font-extrabold">{t("book_review_title")}</h1>
        <p className="text-muted">{items.length ? fill(t("book_review_sub"), { n: items.length }) : t("book_review_empty")}</p>
      </header>
      {items.length > 0 && (
        <Shadowing
          level={level}
          settings={settings}
          providers={providers}
          track
          topic={null}
          mode="review"
          scores={Object.fromEntries(items.map((x) => [x.n, x.best]))}
          groups={topics.map((tp) => ({
            key: `t${tp}`,
            title_de: `#${tp}`,
            items: items.filter((x) => x.topic === tp).map((x) => ({ n: x.n, key: `n${x.n}`, de: x.de, ar: x.ar })),
          }))}
        />
      )}
    </div>
  );
}
