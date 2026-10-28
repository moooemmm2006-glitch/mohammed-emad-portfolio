"use client";

import { forwardRef, useCallback, type HTMLAttributes, type PointerEvent } from "react";
import { useFx } from "@/lib/client/motion";

// 3D tilt on hover (desktop, follows the mouse, max ~8°, with a moving shine) and a press-in on tap.
// Only CSS variables are written on pointer move — no React re-render, transform/opacity only.

const MAX = 8;

export function useTilt() {
  const { fx } = useFx();
  const enabled = fx === "on";
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!enabled || e.pointerType !== "mouse") return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", `${((x - 0.5) * 2 * MAX).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - y) * 2 * MAX).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.dataset.hover = "1";
    },
    [enabled],
  );
  const onPointerLeave = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.dataset.hover = "0";
  }, []);
  return { onPointerMove, onPointerLeave };
}

/** A div with the tilt effect; add `rise-3d` + `--i` for the staggered entrance. */
export const TiltDiv = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function TiltDiv({ className = "", ...rest }, ref) {
  const tilt = useTilt();
  return <div ref={ref} className={`tilt ${className}`} {...tilt} {...rest} />;
});
