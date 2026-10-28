"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { fill } from "@/lib/client/i18n";
import { useFx } from "@/lib/client/motion";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";

// The level's 3D badge: a WebGL tile when 3D effects are on and WebGL works, otherwise a static CSS badge.

const Badge3DCanvas = dynamic(() => import("./Badge3DCanvas"), { ssr: false, loading: () => null });

function webglOk(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function StaticBadge({ level }: { level: Level }) {
  const color = LEVEL_CONFIG[level].accent;
  return (
    <div
      className="static-badge grid place-items-center w-[84%] aspect-square rounded-[28%] text-white font-extrabold de select-none"
      style={{
        background: `radial-gradient(circle at 30% 25%, color-mix(in oklab, ${color} 40%, white), ${color} 55%, color-mix(in oklab, ${color} 60%, black))`,
        boxShadow: `inset -8px -10px 18px rgba(0,0,0,.3), inset 6px 8px 14px rgba(255,255,255,.3), 0 18px 30px -14px ${color}`,
        fontSize: "clamp(2rem, 9vw, 3.2rem)",
      }}
    >
      {level}
    </div>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  const { t } = useUI();
  const { fx } = useFx();
  const [use3d, setUse3d] = useState(false);

  useEffect(() => {
    if (fx !== "on" || !webglOk()) return setUse3d(false);
    // Load the 3D part after the page is painted and idle, so it never delays the first view.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setUse3d(true), { timeout: 2500 }) : window.setTimeout(() => setUse3d(true), 1200);
    return () => (w.cancelIdleCallback ? w.cancelIdleCallback(id) : clearTimeout(id));
  }, [fx]);

  return (
    <div role="img" aria-label={fill(t("badge_alt"), { l: level })} className="relative grid place-items-center w-[120px] h-[120px] sm:w-[180px] sm:h-[180px] shrink-0">
      {use3d ? (
        <div className="absolute inset-0">
          <Badge3DCanvas color={LEVEL_CONFIG[level].accent} label={level} />
        </div>
      ) : (
        <StaticBadge level={level} />
      )}
    </div>
  );
}
