"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import type { Level } from "@/lib/levels";
import type { GrammarLesson } from "@/lib/grammarTypes";
export function GrammarSkillPanel({ level }: { level: Level }) {
  const { t } = useUI();
  const [lessons, setLessons] = useState<GrammarLesson[] | null>(null);
  useEffect(() => {
    let active = true;
    api<GrammarLesson[]>(`/api/grammar/lessons/${level}`).then((data) => { if (active) setLessons(data); }).catch(() => { if (active) setLessons([]); });
    return () => { active = false; };
  }, [level]);
  return <section className="card p-4 sm:p-5 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">📘 {level} · {t("skill_grammar")}</h2><p className="text-sm text-muted mt-1">{t("grammar_intro")}</p></div><Link className="btn btn-ghost" href={`/grammar/${level}`}>{t("grammar_all_lessons")}</Link></header>
    {!lessons ? <p className="text-sm text-muted py-4">{t("loading")}</p> : <div className="grid sm:grid-cols-2 gap-2">{lessons.map((lesson) => <Link key={lesson.id} href={`/grammar/${level}/${lesson.id}`} className="rounded-xl border border-line p-3 hover:bg-surface-2 transition"><span className="text-xs text-muted">{String(lesson.order).padStart(2,"0")} · {lesson.categoryAr}</span><span className="font-semibold block mt-1">{lesson.titleAr}</span><span className="text-sm text-muted block mt-1" dir="ltr">{lesson.titleDe}</span></Link>)}</div>}
  </section>;
}
