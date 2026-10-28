"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import type { BookTopic, TopicSummary } from "@/lib/book";
import type { TopicProgress } from "@/lib/bookProgress";
import type { Level } from "@/lib/levels";

export type TopicCard = TopicSummary & { progress: TopicProgress };

/** The book's Arabic meanings stay Arabic; in the German/English interface they are labelled. */
export function ArabicText({ children, className = "", block = false }: { children: ReactNode; className?: string; block?: boolean }) {
  const { t, lang } = useUI();
  const Tag = block ? "p" : "span";
  return (
    <Tag className={className}>
      {lang !== "ar" && <span className="text-[0.7em] font-semibold uppercase tracking-wide text-muted me-1">{t("arabic_label")}:</span>}
      <span lang="ar" dir="rtl" className="[unicode-bidi:isolate]">
        {children}
      </span>
    </Tag>
  );
}

const topicCache = new Map<Level, Promise<{ topics: TopicCard[]; due: number }>>();
const bookCache = new Map<number, Promise<{ topic: BookTopic; scores: Record<number, number> }>>();

/** The level's topic list (titles, intros, progress), shared by the skill tabs. */
export function useLevelTopics(level: Level, refreshKey = 0) {
  const [topics, setTopics] = useState<TopicCard[] | null>(null);
  const [due, setDue] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (refreshKey) topicCache.delete(level);
    let p = topicCache.get(level);
    if (!p) {
      p = api<{ topics: TopicCard[]; due: number }>(`/api/book/level/${level}`);
      p.catch(() => topicCache.delete(level));
      topicCache.set(level, p);
    }
    let alive = true;
    p.then(
      (x) => {
        if (!alive) return;
        setTopics(x.topics);
        setDue(x.due);
      },
      () => alive && setError(true),
    );
    return () => {
      alive = false;
    };
  }, [level, refreshKey]);
  return { topics, due, error };
}

/** Placeholder cards while the topics load, so nothing below jumps (no layout shift). */
export function TopicSkeleton({ count }: { count: number }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card h-[178px] animate-pulse bg-surface-2/60" />
      ))}
    </ul>
  );
}

/** One whole topic (sentences, vocab, grammar), fetched once. */
export function useBookTopic(n: number | null) {
  const [data, setData] = useState<{ topic: BookTopic; scores: Record<number, number> } | null>(null);
  useEffect(() => {
    if (!n) return setData(null);
    let p = bookCache.get(n);
    if (!p) {
      p = api<{ topic: BookTopic; scores: Record<number, number> }>(`/api/book/topic/${n}`);
      p.catch(() => bookCache.delete(n));
      bookCache.set(n, p);
    }
    let alive = true;
    p.then((d) => alive && setData(d), () => {});
    return () => {
      alive = false;
    };
  }, [n]);
  return data;
}

/** Title of a topic in the interface language: German title first in de/en, Arabic first in ar. */
export function TopicTitle({ tp, size = "base" }: { tp: { title_de: string; title_ar: string }; size?: "base" | "lg" }) {
  const { lang } = useUI();
  const big = size === "lg" ? "text-2xl font-extrabold" : "font-bold leading-snug";
  if (lang === "ar") {
    return (
      <>
        <span className={`block ${big}`}>{tp.title_ar}</span>
        <span dir="ltr" lang="de" className="block de text-sm text-muted font-semibold text-start">
          {tp.title_de}
        </span>
      </>
    );
  }
  return (
    <>
      <span dir="ltr" lang="de" className={`block de ${big}`}>
        {tp.title_de}
      </span>
      <ArabicText className="block text-sm text-muted">{tp.title_ar}</ArabicText>
    </>
  );
}

export function ProgressBar({ value, label, accent = "var(--accent)" }: { value: number; label: string; accent?: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span className="truncate">{label}</span>
        <span className="tabular-nums text-muted">{value}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, background: accent }} />
      </div>
    </div>
  );
}
