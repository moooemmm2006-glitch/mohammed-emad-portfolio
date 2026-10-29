"use client";

import { m } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { LevelBadge } from "@/components/level/LevelBadge";
import { LevelStage } from "@/components/level/LevelStage";
import { ReadPanel } from "@/components/level/ReadPanel";
import { ReadingCompanion } from "@/components/level/ReadingCompanion";
import { ProgressBar } from "@/components/level/shared";
import { SpeakPanel } from "@/components/level/SpeakPanel";
import { useTilt } from "@/components/level/Tilt";
import { WritePanel } from "@/components/level/WritePanel";
import { GrammarSkillPanel } from "@/components/level/GrammarSkillPanel";
import { ListeningForLevel } from "@/components/videos/ListeningHub";
import { LevelEndCards } from "@/components/site/CreatorCard";
import { IntroStrip } from "@/components/site/IntroStrip";
import { api } from "@/lib/client/api";
import { fill, type TKey } from "@/lib/client/i18n";
import { useFx } from "@/lib/client/motion";
import { useUI } from "@/lib/client/ui";
import { isLevel, LEVEL_CONFIG, type Level } from "@/lib/levels";
import { levelPath } from "@/lib/paths";
import type { SkillProgress } from "@/lib/skills";

const SKILLS = [
  { id: "speak", emoji: "🗣️", key: "skill_speak", short: "skill_speak_short", de: "skill_speak_de" },
  { id: "listen", emoji: "🎧", key: "skill_listen", short: "skill_listen_short", de: "skill_listen_de" },
  { id: "read", emoji: "📖", key: "skill_read", short: "skill_read_short", de: "skill_read_de" },
  { id: "write", emoji: "✍️", key: "skill_write", short: "skill_write_short", de: "skill_write_de" },
  { id: "grammar", emoji: "📘", key: "skill_grammar", short: "skill_grammar_short", de: "skill_grammar_de" },
] as const;
type SkillId = (typeof SKILLS)[number]["id"];

export default function LevelPageWrapper() {
  return (
    <Suspense>
      <LevelPage />
    </Suspense>
  );
}

function LevelPage() {
  const { t } = useUI();
  const params = useParams<{ level: string }>();
  const level = params.level?.toUpperCase();
  if (!isLevel(level)) {
    return (
      <p className="py-20 text-center">
        <Link href="/" className="btn btn-primary">
          {t("back")}
        </Link>
      </p>
    );
  }
  return (
    <LevelStage level={level}>
      <LevelContent level={level} />
    </LevelStage>
  );
}

function LevelContent({ level }: { level: Level }) {
  const { t } = useUI();
  const router = useRouter();
  const search = useSearchParams();
  const skill = (SKILLS.find((s) => s.id === search.get("skill"))?.id ?? "speak") as SkillId;
  const [progress, setProgress] = useState<(SkillProgress & { focusMinutes?: number }) | null>(null);
  const { fx } = useFx();
  // The skill shown on arrival appears without the flip; later switches flip.
  const firstSkill = useRef(skill);

  useEffect(() => {
    const load = () => api<SkillProgress & { focusMinutes?: number }>(`/api/level/${level}/progress`).then(setProgress, () => {});
    load();
    window.addEventListener("gs:video-progress", load);
    window.addEventListener("gs:reading-progress", load);
    return () => {
      window.removeEventListener("gs:video-progress", load);
      window.removeEventListener("gs:reading-progress", load);
    };
  }, [level, skill]);

  const setSkill = (id: SkillId) => router.replace(levelPath(level, id === "speak" ? "" : `?skill=${id}`), { scroll: false });

  return (
    <div className={`level-${level.toLowerCase()} max-w-5xl mx-auto space-y-5`}>
      <IntroStrip />
      <LevelHeader level={level} progress={progress} />

      <div role="tablist" aria-label={t("header_level")} className="grid grid-cols-5 gap-1 sm:gap-2 rounded-2xl bg-surface-2/80 p-1 sticky top-14 sm:top-16 z-20 backdrop-blur">
        {SKILLS.map((s) => (
          <SkillTab key={s.id} active={skill === s.id} onClick={() => setSkill(s.id)} emoji={s.emoji} label={t(s.key as TKey)} short={t(s.short as TKey)} de={t(s.de as TKey)} />
        ))}
      </div>

      {/* Switching skills flips the content slightly instead of a hard cut. */}
      <div style={{ perspective: 1100 }}>
        <m.div
          key={skill}
          role="tabpanel"
          initial={firstSkill.current === skill ? false : fx === "on" ? { rotateX: -9, y: 18, opacity: 0 } : { opacity: 0 }}
          animate={{ rotateX: 0, y: 0, opacity: 1 }}
          transition={{ duration: fx === "on" ? 0.42 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "50% 0%" }}
        >
          {skill === "speak" && <SpeakPanel level={level} />}
          {skill === "listen" && <ListeningForLevel level={level} />}
          {skill === "read" && <><ReadingCompanion level={level} /><ReadPanel level={level} /></>}
          {skill === "write" && <WritePanel level={level} />}
          {skill === "grammar" && <GrammarSkillPanel level={level} />}
        </m.div>
      </div>

      {/* After all the content (never between lessons): the owner's channel and the break corner. */}
      <LevelEndCards />
    </div>
  );
}

function SkillTab({ active, onClick, emoji, label, short, de }: { active: boolean; onClick: () => void; emoji: string; label: string; short: string; de: string }) {
  const { lang } = useUI();
  const tilt = useTilt();
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      {...tilt}
      className={`tilt relative rounded-xl px-1 py-2 min-h-[52px] flex flex-col items-center justify-center leading-tight ${active ? "bg-surface depth text-ink" : "text-muted hover:text-ink"}`}
    >
      <span className="text-lg sm:text-xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-[11px] sm:text-sm font-bold truncate max-w-full">
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      {lang !== "de" && (
        <span className="hidden sm:block text-[10px] de text-muted truncate max-w-full" lang="de">
          {de}
        </span>
      )}
    </button>
  );
}

/** Name, description, overall and per-skill progress, the 3D badge; the backdrop moves slower than the page (parallax). */
function LevelHeader({ level, progress }: { level: Level; progress: (SkillProgress & { focusMinutes?: number }) | null }) {
  const { t } = useUI();
  const { fx } = useFx();
  const bg = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (fx !== "on") return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (bg.current) bg.current.style.transform = `translate3d(0, ${Math.min(120, scrollY * 0.35)}px, 0)`;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [fx]);
  const accent = LEVEL_CONFIG[level].accent;
  const overall = progress ? Math.round((progress.speak + progress.listen + progress.read + progress.write) / 4) : null;
  return (
    <header className="relative overflow-hidden rounded-[1.75rem] border border-line depth">
      <div
        ref={bg}
        aria-hidden="true"
        className="absolute -inset-x-10 -top-24 h-[150%] will-change-transform"
        style={{ background: `radial-gradient(60% 70% at 85% 15%, color-mix(in oklab, ${accent} 35%, transparent), transparent 70%), radial-gradient(50% 60% at 10% 90%, color-mix(in oklab, ${accent} 18%, transparent), transparent 70%)` }}
      />
      <div className="relative bg-surface/70 backdrop-blur-sm p-4 sm:p-6 flex items-center gap-3 sm:gap-6">
        <LevelBadge level={level} />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">
            <span className="de" style={{ color: accent }}>
              {level}
            </span>{" "}
            {t(`lvl_${level}_name` as TKey)}
          </h1>
          <p className="text-sm sm:text-base text-muted line-clamp-2">{t(`lvl_${level}_desc` as TKey)}</p>
          <p className="text-sm font-semibold flex flex-wrap items-baseline gap-x-2">
            <span>{t("level_progress")}</span>
            <bdi className="tabular-nums text-base" style={{ color: accent }}>
              {overall ?? "–"}%
            </bdi>
            {!!progress?.focusMinutes && <span className="text-xs text-muted font-medium">{fill(t("level_focus"), { n: progress.focusMinutes })}</span>}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-xl">
            {SKILLS.filter((s) => s.id !== "grammar").map((s) => (
              <ProgressBar key={s.id} label={`${s.emoji} ${t(s.short as TKey)}`} value={progress?.[s.id] ?? 0} accent={accent} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
