"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fill, type TKey } from "@/lib/client/i18n";
import { useFx } from "@/lib/client/motion";
import { useUI } from "@/lib/client/ui";
import { playVaultCelebration } from "@/lib/client/focusSound";
import { BADGES, FOCUS_LINES, type BadgeId, type FocusStats } from "@/lib/focusShared";

// "خزنة الإنجاز" 🏆: when a focus session is finished, a 3D vault opens (CSS 3D), gold coins and party
// confetti fly out (canvas-confetti, loaded only now), a generated cha-ching plays, and a glassy card
// shows the result. About 3 seconds; Esc, a click outside or any button closes it.

export interface CelebrationProps {
  minutes: number;
  goal: string;
  stats: FocusStats | null;
  newBadges: BadgeId[];
  sound: boolean;
  breakMinutes: number | null;
  onGoal: (done: boolean) => void;
  onBreak: () => void;
  onMore: () => void;
  onClose: () => void;
}

export default function Celebration(p: CelebrationProps) {
  const { t } = useUI();
  const { fx } = useFx();
  // Reduced motion / effects off: no 3D door and no flying coins — a simple fade and a few static coins.
  const calm = fx === "off";
  const [cardIn, setCardIn] = useState(calm);
  const [goalAnswer, setGoalAnswer] = useState<boolean | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const close = useRef(p.onClose);
  close.current = p.onClose;
  const line = useMemo(() => `focus_line_${1 + Math.floor(Math.random() * FOCUS_LINES)}` as TKey, []);

  useEffect(() => {
    if (p.sound) playVaultCelebration();
    const key = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", key);
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!calm) {
      timers.push(setTimeout(() => setCardIn(true), 1900));
      timers.push(setTimeout(() => void burst(canvas.current, fx === "mild"), 1250));
    }
    return () => {
      document.removeEventListener("keydown", key);
      timers.forEach(clearTimeout);
    };
    // run once when the celebration opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cardIn) card.current?.querySelector<HTMLElement>("button")?.focus();
  }, [cardIn]);

  const badges = BADGES.filter((b) => p.newBadges.includes(b.id));

  return createPortal(
    <div className={`focus-celebration fixed inset-0 z-[80] grid place-items-center p-4 ${calm ? "calm" : ""}`} role="dialog" aria-modal="true" aria-label={fill(t("focus_done_title"), { n: p.minutes })}>
      <button type="button" className="absolute inset-0 bg-black/60 sheet-fade" aria-label={t("close")} tabIndex={-1} onClick={p.onClose} />
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 w-full h-full" aria-hidden="true" />

      <div className="relative grid place-items-center">
        {/* the vault */}
        <div className="vault-stage" aria-hidden="true">
          <div className="vault-body">
            <div className="vault-inside">
              <div className="vault-glow" />
              <span className="vault-coin c1">€</span>
              <span className="vault-coin c2">★</span>
              <span className="vault-coin c3">€</span>
            </div>
            <div className="vault-door">
              <span className="bolt b1" />
              <span className="bolt b2" />
              <span className="bolt b3" />
              <span className="bolt b4" />
              <div className="vault-dial">
                {Array.from({ length: 12 }, (_, i) => (
                  <i key={i} style={{ transform: `rotate(${i * 30}deg)` }} />
                ))}
                <span className="vault-handle" />
              </div>
            </div>
          </div>
        </div>

        {/* the message card over the open vault */}
        {cardIn && (
          <div ref={card} className="focus-card absolute w-[min(92vw,30rem)] rounded-3xl p-5 sm:p-6 text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">{fill(t("focus_done_title"), { n: p.minutes })}</h2>
            <p className="text-base leading-relaxed">{t(line)}</p>

            {badges.map((b) => (
              <p key={b.id} className="badge-reveal inline-flex items-center gap-2 rounded-full bg-[#ffc61a]/20 border border-[#ffc61a]/60 px-4 py-1.5 font-bold">
                <span className="text-2xl">{b.emoji}</span> {t("focus_new_badge")} {t(`badge_${b.id}` as TKey)}
              </p>
            ))}

            {p.goal && (
              <div className="rounded-2xl bg-surface-2/70 p-3 space-y-2">
                <p className="text-sm font-semibold" dir="auto">
                  {fill(t("focus_goal_q"), { goal: p.goal })}
                </p>
                {goalAnswer === null ? (
                  <div className="flex justify-center gap-2">
                    <button type="button" className="btn btn-primary !min-h-[38px] !py-1" onClick={() => (setGoalAnswer(true), p.onGoal(true))}>
                      {t("focus_yes")}
                    </button>
                    <button type="button" className="btn btn-ghost !min-h-[38px] !py-1" onClick={() => (setGoalAnswer(false), p.onGoal(false))}>
                      {t("focus_not_yet")}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-bold">{goalAnswer ? t("focus_goal_yes") : t("focus_goal_later")}</p>
                )}
              </div>
            )}

            <p className="text-sm text-muted tabular-nums">
              {p.stats ? fill(t("focus_stats"), { x: p.stats.todayMinutes, s: p.stats.streak, t: p.stats.totalMinutes }) : "…"}
            </p>

            <div className="grid gap-2 pt-1">
              {p.breakMinutes && (
                <button type="button" className="btn btn-primary" style={{ background: "#16a34a" }} onClick={p.onBreak}>
                  {fill(t("focus_take_break"), { n: p.breakMinutes })}
                </button>
              )}
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost flex-1" onClick={p.onMore}>
                  {t("focus_more")}
                </button>
                <button type="button" className="btn btn-ghost flex-1" onClick={p.onClose}>
                  {t("focus_enough")}
                </button>
              </div>
              <Link href="/pause" className="text-sm text-muted underline underline-offset-4" onClick={p.onClose}>
                ☕ {t("pause_name")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Gold coins from the vault + party confetti from both sides. */
async function burst(el: HTMLCanvasElement | null, light: boolean) {
  if (!el) return;
  const { default: confetti } = await import("canvas-confetti");
  const fire = confetti.create(el, { resize: true, useWorker: true });
  const gold = ["#ffd700", "#f5b301", "#e6a100", "#fff1a8"];
  const coin = confetti.shapeFromText({ text: "€", scalar: 2.2, color: "#b8860b" });
  const star = confetti.shapeFromText({ text: "★", scalar: 2.2, color: "#f5b301" });
  const n = light ? 0.5 : 1;
  // coins out of the open door, falling with gravity
  void fire({ particleCount: Math.round(70 * n), spread: 75, startVelocity: 42, gravity: 1.3, ticks: 260, origin: { x: 0.5, y: 0.5 }, shapes: ["circle"], colors: gold, scalar: 1.5 });
  void fire({ particleCount: Math.round(26 * n), spread: 90, startVelocity: 38, gravity: 1.2, ticks: 260, origin: { x: 0.5, y: 0.5 }, shapes: [coin, star], scalar: 2.2, flat: true });
  // party confetti from the left and the right
  const party = { particleCount: Math.round(90 * n), spread: 70, startVelocity: 60, ticks: 300, gravity: 0.9, scalar: 1.1 };
  void fire({ ...party, angle: 60, origin: { x: 0, y: 0.85 } });
  void fire({ ...party, angle: 120, origin: { x: 1, y: 0.85 } });
  setTimeout(() => {
    void fire({ ...party, particleCount: Math.round(45 * n), angle: 75, origin: { x: 0, y: 0.7 } });
    void fire({ ...party, particleCount: Math.round(45 * n), angle: 105, origin: { x: 1, y: 0.7 } });
  }, 350);
}
