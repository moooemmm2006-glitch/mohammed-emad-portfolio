"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { fill, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { Level } from "@/lib/levels";
import type { PlanStepId } from "@/lib/planShared";

// After every finished step of the plan: a small comic panel with our own simple character and a scene
// about what German opens up (a job with good pay, a call-center seat, travel, a big company, studying).
// A finished topic gets a bigger "level up" panel. Original drawings only.

type Scene = "callcenter" | "money" | "travel" | "office" | "study";
const SCENES: Scene[] = ["callcenter", "money", "travel", "office", "study"];

/** Our learner: a round, friendly figure (not based on any existing character). */
function Learner({ x, y, accessory }: { x: number; y: number; accessory?: "headset" | "cap" | "badge" }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-22" y="34" width="44" height="46" rx="18" fill="#2563eb" />
      <circle cx="0" cy="18" r="22" fill="#f2c9a0" stroke="#1f2937" strokeWidth="2.5" />
      <path d="M-22 12 Q-18 -8 0 -6 Q18 -8 22 12 Q12 2 0 4 Q-12 2 -22 12Z" fill="#1f2937" />
      <circle cx="-8" cy="18" r="2.6" fill="#1f2937" />
      <circle cx="8" cy="18" r="2.6" fill="#1f2937" />
      <path d="M-8 28 Q0 35 8 28" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {accessory === "headset" && (
        <>
          <path d="M-24 16 Q-24 -12 0 -12 Q24 -12 24 16" stroke="#111827" strokeWidth="4" fill="none" />
          <rect x="-28" y="12" width="8" height="14" rx="3" fill="#111827" />
          <path d="M-24 26 Q-20 38 -6 36" stroke="#111827" strokeWidth="3" fill="none" />
        </>
      )}
      {accessory === "cap" && (
        <>
          <path d="M-26 -4 L0 -16 L26 -4 L0 6Z" fill="#111827" />
          <path d="M18 -2 L20 14" stroke="#f59e0b" strokeWidth="3" />
        </>
      )}
      {accessory === "badge" && <rect x="6" y="44" width="12" height="16" rx="2" fill="#fff" stroke="#1f2937" strokeWidth="2" />}
    </g>
  );
}

function SceneArt({ scene }: { scene: Scene }) {
  return (
    <svg viewBox="0 0 220 150" className="w-full h-auto" aria-hidden="true">
      <defs>
        <pattern id="dots" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#0f172a" opacity="0.08" />
        </pattern>
      </defs>
      <rect width="220" height="150" fill="#fff7d6" />
      <rect width="220" height="150" fill="url(#dots)" />
      {scene === "callcenter" && (
        <>
          <rect x="112" y="36" width="78" height="52" rx="6" fill="#0f172a" />
          <polyline points="122,78 138,66 152,70 166,52 180,44" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
          <path d="M174 44 L180 44 L180 50" stroke="#22c55e" strokeWidth="4" fill="none" />
          <rect x="100" y="96" width="110" height="8" rx="3" fill="#92400e" />
          <Learner x={62} y={52} accessory="headset" />
        </>
      )}
      {scene === "money" && (
        <>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${130 + i * 22} ${92 - i * 18}) rotate(${-8 + i * 8})`}>
              <rect width="46" height="26" rx="4" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
              <text x="23" y="18" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">€</text>
            </g>
          ))}
          <circle cx="120" cy="40" r="10" fill="#facc15" stroke="#a16207" strokeWidth="2" />
          <circle cx="196" cy="128" r="9" fill="#facc15" stroke="#a16207" strokeWidth="2" />
          <Learner x={62} y={52} />
        </>
      )}
      {scene === "travel" && (
        <>
          <path d="M120 70 L196 40 L204 46 L150 78 L164 104 L156 108 L136 84 L120 92 L114 88 L126 78Z" fill="#e5e7eb" stroke="#334155" strokeWidth="2" />
          <path d="M100 120 Q150 100 210 112" stroke="#38bdf8" strokeWidth="3" fill="none" strokeDasharray="6 6" />
          <rect x="96" y="100" width="22" height="30" rx="4" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
          <Learner x={62} y={52} />
        </>
      )}
      {scene === "office" && (
        <>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={118 + i * 30} y={30 + (i % 2) * 18} width="26" height={100 - (i % 2) * 18} fill={["#1d4ed8", "#0f766e", "#7c3aed"][i]} />
          ))}
          {Array.from({ length: 9 }, (_, k) => (
            <rect key={k} x={123 + (k % 3) * 30} y={40 + Math.floor(k / 3) * 22 + ((k % 3) % 2) * 18} width="8" height="8" fill="#fde68a" />
          ))}
          <Learner x={62} y={52} accessory="badge" />
        </>
      )}
      {scene === "study" && (
        <>
          <rect x="120" y="96" width="78" height="10" rx="2" fill="#2563eb" />
          <rect x="126" y="84" width="70" height="10" rx="2" fill="#f97316" />
          <rect x="122" y="72" width="74" height="10" rx="2" fill="#16a34a" />
          <text x="160" y="54" textAnchor="middle" fontSize="22" fontWeight="900" fill="#0f172a">B2 ✓</text>
          <Learner x={62} y={52} accessory="cap" />
        </>
      )}
    </svg>
  );
}

export function MotivationComic({ level, topicNumber, total, topicDone, step, onClose }: { level: Level; topicNumber: number; total: number; topicDone: boolean; step: PlanStepId; onClose: () => void }) {
  const { t } = useUI();
  const scene = useMemo(() => SCENES[Math.floor(Math.random() * SCENES.length)], []);
  useEffect(() => {
    const id = setTimeout(onClose, topicDone ? 9000 : 6000);
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(id);
      document.removeEventListener("keydown", key);
    };
  }, [onClose, topicDone]);

  return createPortal(
    <div className="fixed inset-x-0 bottom-[max(5.5rem,env(safe-area-inset-bottom))] md:bottom-6 z-[70] flex justify-center px-3 pointer-events-none" role="status" aria-live="polite" data-testid="motivation-comic">
      <div className="comic-pop pointer-events-auto w-full max-w-md rounded-3xl border-[3px] border-slate-900 bg-white text-slate-900 shadow-[6px_6px_0_#0f172a] overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-300 border-b-[3px] border-slate-900">
          <p className="font-black tracking-wide text-sm">{topicDone ? fill(t("comic_topic_done"), { n: topicNumber, t: total }) : t(`comic_step_${step}` as TKey)}</p>
          <button type="button" className="grid place-items-center w-8 h-8 rounded-full hover:bg-black/10 font-bold" onClick={onClose} aria-label={t("close")}>
            ×
          </button>
        </div>
        <div className="grid grid-cols-[1fr_1.1fr] items-center gap-2 p-3">
          <SceneArt scene={scene} />
          <div className="relative rounded-2xl border-[3px] border-slate-900 bg-white p-3 text-[15px] font-bold leading-snug">
            <span className="absolute top-1/2 -start-3 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-e-[12px] border-e-slate-900" aria-hidden="true" />
            {fill(t(`comic_${scene}` as TKey), { level })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
