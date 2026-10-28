"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { fill, localeOf } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { GeminiSession } from "@/lib/gemini";
import { SparkleIcon } from "./GeminiCard";

/** Under "Reports": the reports the learner pasted from Gemini, text kept as written (line breaks, RTL). */
export function GeminiReports() {
  const { t, lang } = useUI();
  const [items, setItems] = useState<GeminiSession[] | null>(null);
  useEffect(() => {
    api<{ sessions: GeminiSession[] }>("/api/gemini/sessions").then((d) => setItems(d.sessions), () => setItems([]));
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm(t("gem_delete_confirm"))) return;
    await api(`/api/gemini/sessions/${id}`, { method: "DELETE" }).then(() => setItems((xs) => xs?.filter((x) => x.id !== id) ?? null), () => {});
  };

  if (!items?.length) return null;
  return (
    <section className="card p-3 sm:p-5 space-y-3" aria-label={t("gem_reports_title")}>
      <h2 className="text-lg font-bold flex items-center gap-2 px-2 sm:px-0">
        <SparkleIcon size={22} /> {t("gem_reports_title")}
      </h2>
      <ul className="divide-y divide-line">
        {items.map((s) => (
          <li key={s.id} className={`level-${s.level.toLowerCase()}`}>
            <details className="group">
              <summary className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-surface-2 cursor-pointer list-none">
                <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white bg-accent de">{s.level}</span>
                <span className="text-sm min-w-0 flex-1">
                  {new Date(s.createdAt).toLocaleString(localeOf(lang), { dateStyle: "medium", timeStyle: "short" })}
                  <span className="block text-xs text-muted truncate">
                    {s.topic != null ? fill(t("gem_topic_n"), { n: s.topic }) : s.video ? <span className="de" dir="ltr">🎬 {s.video}</span> : t("gem_whole_level")}
                  </span>
                </span>
                <span className="chip !min-h-0 !py-0.5 text-xs font-bold shrink-0">{t("gem_tag")}</span>
              </summary>
              <div className="px-2 pb-3 space-y-2">
                <p dir="auto" className="whitespace-pre-wrap break-words rounded-xl bg-surface-2 p-3 text-sm leading-relaxed text-start">
                  {s.text}
                </p>
                <button type="button" className="text-xs text-danger underline underline-offset-4 min-h-[36px]" onClick={() => void remove(s.id)}>
                  {t("gem_delete")}
                </button>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
