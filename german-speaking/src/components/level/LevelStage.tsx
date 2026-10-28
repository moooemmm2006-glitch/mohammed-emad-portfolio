"use client";

import { m } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFx } from "@/lib/client/motion";
import { useUI } from "@/lib/client/ui";
import { LEVELS, type Level } from "@/lib/levels";
import { levelPath } from "@/lib/paths";

// Switching levels turns the page like the side of a cube (rotateY ±90° around the edge, ~550 ms).
// Direction follows the move (A1 → A2 = forward) and flips in RTL. Swipe left/right on phones too.

let lastLevel: Level | null = null;

export function LevelStage({ level, children }: { level: Level; children: ReactNode }) {
  const { fx } = useFx();
  const { lang } = useUI();
  const router = useRouter();
  const rtl = lang === "ar";
  // Where we came from: read before the effect below records the new level (works with or without a remount).
  const from = useMemo(() => lastLevel, [level]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    lastLevel = level;
  }, [level]);
  const step = from && from !== level ? LEVELS.indexOf(level) - LEVELS.indexOf(from) : 0;
  // Forward = the new side comes in from the reading end (right in LTR, left in RTL), hinged on that
  // edge and swinging in from behind (rotateY(-90°) around the right edge = the right side of a cube).
  const sign = step === 0 ? 0 : (step > 0 ? 1 : -1) * (rtl ? -1 : 1);

  // First visit: no entry animation, so the page paints right away (fast LCP); only level switches animate.
  const initial =
    sign === 0
      ? false
      : fx === "on"
        ? { rotateY: -90 * sign, opacity: 0.2 }
        : fx === "mild"
          ? { x: 40 * sign, opacity: 0 }
          : { opacity: 0 };

  // Swipe: horizontal, clearly not a scroll, and not inside something that scrolls sideways.
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest("input, textarea, [data-no-swipe], .overflow-x-auto, video, iframe")) return (touch.current = null);
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - s.t > 700) return;
    // LTR: swipe left = next level; RTL: swipe right = next level.
    const forward = rtl ? dx > 0 : dx < 0;
    const i = LEVELS.indexOf(level) + (forward ? 1 : -1);
    if (i >= 0 && i < LEVELS.length) router.push(levelPath(LEVELS[i]));
  };

  return (
    <div className="cube-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <m.div
        key={level}
        initial={initial}
        animate={{ rotateY: 0, x: 0, y: 0, opacity: 1 }}
        transition={{ duration: fx === "on" && sign ? 0.56 : 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: sign === 0 ? "50% 50%" : sign > 0 ? "100% 50%" : "0% 50%", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
      >
        {children}
      </m.div>
    </div>
  );
}
