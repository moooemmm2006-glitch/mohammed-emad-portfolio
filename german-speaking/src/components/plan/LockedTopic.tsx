"use client";

import Link from "next/link";
import { fill } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { Level } from "@/lib/levels";
import { levelPath, topicPath } from "@/lib/paths";

/** 🔒 A topic that opens later in the learner's plan (they agreed to go in order). */
export function LockedTopic({ level, openTopic }: { level: Level; openTopic: number | null }) {
  const { t } = useUI();
  return (
    <section className="card depth max-w-xl mx-auto p-6 sm:p-8 text-center space-y-4" data-testid="topic-locked">
      <h1 className="text-2xl font-extrabold">{t("topic_locked_title")}</h1>
      <p className="text-muted leading-relaxed">{fill(t("topic_locked_text"), { level, n: openTopic ?? "?" })}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {openTopic && (
          <Link href={topicPath(level, openTopic)} className="btn btn-primary">
            {fill(t("topic_locked_go"), { n: openTopic })}
          </Link>
        )}
        <Link href={levelPath(level, "/plan")} className="btn btn-ghost">
          {t("plan_card_open")}
        </Link>
      </div>
    </section>
  );
}
