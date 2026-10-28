"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMe } from "./me";
import { resolveFx, type Fx, type FxPref } from "./fx";

// The 3D effects level for the whole site (see fx.ts).

export type { Fx, FxPref };

interface FxCtx {
  fx: Fx;
  pref: FxPref;
  setPref: (p: FxPref) => void;
}

const Ctx = createContext<FxCtx>({ fx: "mild", pref: "auto", setPref: () => {} });

const loadFeatures = () => import("./motionFeatures").then((m) => m.default);

/** Weak phones get "mild" by default. */
function isLowEnd(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = matchMedia("(pointer: coarse)").matches;
  return coarse && ((nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4);
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const { me } = useMe();
  const [pref, setPrefState] = useState<FxPref>("auto");
  const [reduced, setReduced] = useState(false);
  const [lowEnd, setLowEnd] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gs.fx") as FxPref | null;
      if (saved) setPrefState(saved);
    } catch {
      /* ignore */
    }
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    setLowEnd(isLowEnd());
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // The account's choice wins once known.
  useEffect(() => {
    if (me?.prefs?.effects) setPrefState(me.prefs.effects);
  }, [me?.prefs?.effects]);

  const fx = resolveFx(pref, reduced, lowEnd);
  useEffect(() => {
    document.documentElement.dataset.fx = fx;
  }, [fx]);

  const setPref = useCallback((p: FxPref) => {
    setPrefState(p);
    try {
      localStorage.setItem("gs.fx", p);
    } catch {
      /* ignore */
    }
    void fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ effects: p }) }).catch(() => {});
  }, []);

  const value = useMemo(() => ({ fx, pref, setPref }), [fx, pref, setPref]);
  return (
    <Ctx.Provider value={value}>
      <LazyMotion features={loadFeatures} strict>
        <MotionConfig reducedMotion={fx === "off" ? "always" : "never"}>{children}</MotionConfig>
      </LazyMotion>
    </Ctx.Provider>
  );
}

export const useFx = () => useContext(Ctx);
