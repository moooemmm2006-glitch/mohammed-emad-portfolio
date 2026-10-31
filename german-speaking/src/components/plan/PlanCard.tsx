"use client";

import Link from "next/link";
import { fill, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";
import { levelPath } from "@/lib/paths";
import { currentIndex, PLAN_STEPS } from "@/lib/planShared";
import { usePlan } from "./LevelPlan";

/** 🗺️ On the level page: where you are in the plan and the next step, or an invitation to start it. */
export function PlanCard({ level }: { level: Level }) {
  const { t } = useUI();
  const { data } = usePlan(level);
  if (!data) return null;
  const accent = LEVEL_CONFIG[level].accent;
  const i = currentIndex(data.state, data.topics);
  const topic = i >= 0 ? data.topics[i] : null;
  const next = topic ? PLAN_STEPS.find((s) => !data.state[topic]?.[s.id]?.done) : null;
  const text = !data.start
    ? fill(t("plan_card_new"), { n: data.duration.topics, w: data.duration.weeks })
    : topic && next
      ? fill(t("plan_card_now"), { i: i + 1, n: data.topics.length, day: `${fill(t("plan_day"), { n: next.day })}: ${t(`plan_step_${next.id}` as TKey)}` })
      : fill(t("plan_card_all_done"), { level });
  return (
    <section className="card p-4 sm:p-5 flex flex-wrap items-center gap-3 justify-between" style={{ borderInlineStart: `4px solid ${accent}` }} data-testid="plan-card">
      <div className="min-w-0">
        <h2 className="font-extrabold text-lg">{fill(t("plan_card_title"), { level })}</h2>
        <p className="text-sm text-muted mt-0.5">{text}</p>
      </div>
      <Link href={levelPath(level, "/plan")} className="btn btn-primary !min-h-[42px]" style={{ background: accent }}>
        {t("plan_card_open")}
      </Link>
    </section>
  );
}
