"use client";

import { useRef, type ReactNode } from "react";
import { NicosWegSection } from "./NicosWegSection";
import { VideoThemaSection } from "./VideoThemaSection";
import { EasyGermanLevelSection } from "./EasyGermanLevelSection";
import { PodcastSection } from "./PodcastSection";
import { FilmsSection } from "./FilmsSection";
import { useUI } from "@/lib/client/ui";
import type { Level } from "@/lib/levels";

type Section = { id: string; titleKey: "vid_nicos_title" | "vid_vt_title" | "eg_title" | "pod_section_title" | "film_title"; introKey: "listen_nicos_intro" | "listen_vt_intro" | "listen_easy_intro" | "listen_podcast_short" | "listen_film_intro"; content: ReactNode };

/** B1/B2 listening catalog. The legacy A1/A2 screens stay on their existing components. */
export function ListeningHub({ level }: { level: "B1" | "B2" }) {
  const { t } = useUI();
  const root = useRef<HTMLDivElement>(null);
  const sections: Section[] = level === "B1" ? [
    { id: "listen-nicos", titleKey: "vid_nicos_title", introKey: "listen_nicos_intro", content: <NicosWegSection level="B1" hideIntro /> },
    { id: "listen-easy-german", titleKey: "eg_title", introKey: "listen_easy_intro", content: <EasyGermanLevelSection level="B1" /> },
    { id: "listen-podcast", titleKey: "pod_section_title", introKey: "listen_podcast_short", content: <PodcastSection level="B1" /> },
  ] : [
    { id: "listen-video-thema", titleKey: "vid_vt_title", introKey: "listen_vt_intro", content: <VideoThemaSection hideIntro /> },
    { id: "listen-easy-german", titleKey: "eg_title", introKey: "listen_easy_intro", content: <EasyGermanLevelSection level="B2" /> },
    { id: "listen-podcast", titleKey: "pod_section_title", introKey: "listen_podcast_short", content: <PodcastSection level="B2" /> },
    { id: "listen-films", titleKey: "film_title", introKey: "listen_film_intro", content: <FilmsSection /> },
  ];

  return (
    <div ref={root} className="space-y-4" aria-label={t("tab_hoeren")}>
      <nav aria-label={t("listen_jump_title")} className="md:hidden -mx-1 overflow-x-auto overscroll-x-contain" data-no-swipe>
        <div className="flex w-max gap-2 px-1 py-1">
          {sections.map((section) => (
            <button key={section.id} type="button" className="chip shrink-0 !min-h-[40px] text-sm" onClick={() => {
              const target = root.current?.querySelector<HTMLDetailsElement>(`#${section.id}`);
              if (target) target.open = true;
              target?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}>
              {t(section.titleKey)}
            </button>
          ))}
        </div>
      </nav>
      {sections.map((section, index) => (
        <details id={section.id} key={section.id} className="listening-section card scroll-mt-32 overflow-hidden" open={index === 0}>
          <summary className="listening-section-summary cursor-pointer list-none p-4 sm:p-5 min-h-[76px] hover:bg-surface-2/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <span className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 text-lg">{section.titleKey === "vid_nicos_title" || section.titleKey === "vid_vt_title" ? "🎬" : section.titleKey === "film_title" ? "🍿" : "🎧"}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{section.titleKey === "pod_section_title" ? "🎙️ " : ""}{t(section.titleKey)}</span>
                <span className="mt-1 block text-sm text-muted leading-snug">{t(section.introKey)}</span>
              </span>
              <span className="listening-chevron text-muted" aria-hidden="true">⌄</span>
            </span>
          </summary>
          <div className="border-t border-line p-3 sm:p-5">{section.content}</div>
        </details>
      ))}
    </div>
  );
}

export function ListeningForLevel({ level }: { level: Level }) {
  if (level === "A1" || level === "A2") return <NicosWegSection level={level} />;
  return <ListeningHub level={level} />;
}
