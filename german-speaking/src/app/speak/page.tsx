"use client";

import Link from "next/link";
import { LevelGroups } from "@/components/LevelCard";
import { useStats } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";

export default function SpeakPage() {
  const { t, lang } = useUI();
  const { stats } = useStats();
  const unfinished = stats?.unfinished ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold">
          {t("speak_title")} · <span className="de">Ich spreche</span>
        </h1>
        <p className="text-muted mt-2 max-w-2xl">{t("speak_sub")}</p>
      </header>

      {unfinished.length > 0 && (
        <section className="card p-5 border-gold/50">
          <h2 className="font-bold">{t("unfinished_title")}</h2>
          <p className="text-sm text-muted mb-3">{t("unfinished_body")}</p>
          <ul className="divide-y divide-line">
            {unfinished.slice(0, 5).map((s) => (
              <li key={s.id} className={`level-${s.level.toLowerCase()} flex flex-wrap items-center gap-3 py-2`}>
                <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white bg-accent de">{s.level}</span>
                <span className="text-sm">{new Date(s.startedAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                <span className="text-sm text-muted">
                  {t("info_turns")}: {s.userTurns}
                </span>
                <span className="ms-auto flex gap-2">
                  <Link className="btn btn-ghost !min-h-[36px] !py-1 text-sm" href={`/speak/${s.level}?session=${s.id}`}>
                    {t("unfinished_resume")}
                  </Link>
                  <Link className="btn btn-primary !min-h-[36px] !py-1 text-sm" href={`/reports/${s.id}?generate=1`}>
                    {t("unfinished_report")}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LevelGroups levels={stats?.levels} />
    </div>
  );
}
