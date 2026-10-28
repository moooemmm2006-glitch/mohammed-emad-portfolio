"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GEMINI_URL, geminiPrompt, type GeminiContext } from "../../../data/gemini-prompts";
import { api } from "@/lib/client/api";
import { copyAndOpen, copyText } from "@/lib/client/clipboard";
import { fill } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { Level } from "@/lib/levels";
import { Modal } from "../Modal";
import { TiltDiv } from "../level/Tilt";

// "Talk with Gemini": copy level/topic/video instructions and open Gemini (free; Gemini Live for voice).
// The site is not made by or linked to Google; the icon below is our own simple four-point star.

/** Our own sparkle icon (a plain four-point star in a neutral gradient), not a brand logo. */
export function SparkleIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.55" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <path d="M12 1.5c.6 5.6 4.9 9.9 10.5 10.5-5.6.6-9.9 4.9-10.5 10.5C11.4 16.9 7.1 12.6 1.5 12 7.1 11.4 11.4 7.1 12 1.5Z" fill={`url(#${id})`} stroke="rgba(15,23,42,.35)" strokeWidth=".6" />
    </svg>
  );
}

/** Small status message at the bottom of the screen. */
function useToast() {
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (text: string, bad = false) => {
    clearTimeout(timer.current);
    setMsg({ text, bad });
    timer.current = setTimeout(() => setMsg(null), 3200);
  };
  const node =
    msg &&
    createPortal(
      <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 pointer-events-none">
        <p className={`sheet-fade rounded-full px-4 py-2.5 text-sm font-semibold shadow-xl ${msg.bad ? "bg-danger text-white" : "bg-ink text-bg"}`}>{msg.text}</p>
      </div>,
      document.body,
    );
  return { show, node };
}

interface Props {
  level: Level;
  ctx?: GeminiContext;
  /** For the pasted report: the book topic number / video title the talk was about. */
  topic?: number | null;
  video?: string | null;
  /** "full" on the level page, "compact" inside a topic. */
  variant?: "full" | "compact";
}

export function GeminiCard({ level, ctx = { kind: "level" }, topic = null, video = null, variant = "full" }: Props) {
  const { t } = useUI();
  const original = useMemo(() => geminiPrompt(level, ctx), [level, ctx]);
  const [prompt, setPrompt] = useState(original);
  const [showPrompt, setShowPrompt] = useState(false);
  const toast = useToast();
  useEffect(() => setPrompt(original), [original]);

  const start = () => {
    void copyAndOpen(prompt, GEMINI_URL).then((ok) => {
      if (ok) toast.show(t("gem_copied"));
      else {
        setShowPrompt(true);
        toast.show(t("gem_copy_failed"), true);
      }
    });
  };
  const copyOnly = async () => {
    if (await copyText(prompt)) toast.show(t("gem_copied"));
    else {
      setShowPrompt(true);
      toast.show(t("gem_copy_failed"), true);
    }
  };

  const full = variant === "full";
  const subtitle = ctx.kind === "topic" ? fill(t("gem_sub_topic"), { level, topic: ctx.title_de }) : fill(t("gem_sub"), { level });

  return (
    <section aria-label={t("gem_title")} className="space-y-2">
      <TiltDiv className={`gemini-card rounded-3xl depth ${full ? "p-5 sm:p-6" : "p-4 sm:p-5"}`}>
        <div className={`flex items-start gap-3 ${full ? "sm:gap-4" : ""}`}>
          <span className={`gem-spark shrink-0 grid place-items-center rounded-2xl bg-ink/85 dark:bg-white/10 shadow-inner ${full ? "w-14 h-14" : "w-11 h-11"}`}>
            <SparkleIcon size={full ? 30 : 24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={`${full ? "text-xl sm:text-2xl" : "text-lg"} font-extrabold leading-tight flex flex-wrap items-center gap-x-2`}>
              {ctx.kind === "topic" ? t("gem_title_topic") : t("gem_title")}
              <span className="chip !min-h-0 !py-0.5 text-xs font-bold text-ok">{t("gem_free")}</span>
            </h2>
            <p className="mt-1 text-sm text-muted leading-relaxed">{subtitle}</p>
          </div>
        </div>

        <ol className={`mt-4 grid gap-2 ${full ? "sm:grid-cols-3" : ""}`}>
          <Step n={1}>
            <span>{t("gem_step1")}</span>
            {full && (
              <button type="button" className="chip !min-h-[34px] text-xs font-semibold" onClick={() => void copyOnly()}>
                {t("gem_step1_btn")}
              </button>
            )}
          </Step>
          <Step n={2}>
            <span>{t("gem_step2")}</span>
            {full && (
              <a className="chip !min-h-[34px] text-xs font-semibold" href={GEMINI_URL} target="_blank" rel="noopener noreferrer">
                {t("gem_step2_btn")} ↗
              </a>
            )}
          </Step>
          <Step n={3}>
            <span>{t("gem_step3")}</span>
          </Step>
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={`btn btn-primary ${full ? "w-full sm:w-auto text-lg !px-6" : ""}`} style={{ background: "var(--accent)", color: "#fff" }} onClick={start}>
            <SparkleIcon size={20} /> {t("gem_start")}
          </button>
          <button type="button" className="btn btn-ghost !min-h-[44px]" onClick={() => void copyOnly()}>
            {t("gem_copy_only")}
          </button>
        </div>

        <details className="mt-3 rounded-2xl bg-surface/70 border border-line/70" open={showPrompt} onToggle={(e) => setShowPrompt(e.currentTarget.open)}>
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold min-h-[44px] flex items-center">{t("gem_show_prompt")}</summary>
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs text-muted">{t("gem_prompt_edit")}</p>
            <textarea
              dir="ltr"
              lang="de"
              className="w-full min-h-[16rem] rounded-xl border border-line bg-surface p-3 text-sm leading-relaxed font-mono text-start"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              aria-label={t("gem_show_prompt")}
              spellCheck={false}
            />
            {prompt !== original && (
              <button type="button" className="chip !min-h-[34px] text-xs" onClick={() => setPrompt(original)}>
                {t("gem_prompt_reset")}
              </button>
            )}
          </div>
        </details>
      </TiltDiv>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <p className="text-xs text-muted">{t("gem_note")}</p>
        <GeminiReportLink level={level} topic={topic} video={video} onSaved={(m) => toast.show(m)} />
      </div>
      {toast.node}
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 rounded-2xl bg-surface/60 border border-line/60 px-3 py-2 text-sm">
      <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-accent text-white text-xs font-bold tabular-nums">{n}</span>
      <span className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-2">{children}</span>
    </li>
  );
}

/** "Talk with Gemini about this video": one small link under a video. */
export function GeminiVideoLink({ level, title }: { level: Level; title: string }) {
  const { t } = useUI();
  const toast = useToast();
  const prompt = useMemo(() => geminiPrompt(level, { kind: "video", title }), [level, title]);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline min-h-[40px]"
        onClick={() =>
          void copyAndOpen(prompt, GEMINI_URL).then((ok) => (ok ? toast.show(t("gem_copied")) : toast.show(t("gem_copy_failed_video"), true)))
        }
      >
        <SparkleIcon size={18} /> {t("gem_video_link")} ↗
      </button>
      <GeminiReportLink level={level} video={title} onSaved={(m) => toast.show(m)} />
      {toast.node}
    </div>
  );
}

/** "Done? Paste Gemini's report here" → saved per user, shown under Reports. */
export function GeminiReportLink({ level, topic = null, video = null, onSaved }: { level: Level; topic?: number | null; video?: string | null; onSaved?: (msg: string) => void }) {
  const { t } = useUI();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  const save = async () => {
    setState("saving");
    try {
      await api("/api/gemini/sessions", { method: "POST", body: JSON.stringify({ level, topic, video, text }) });
      setOpen(false);
      setText("");
      setState("idle");
      onSaved?.(t("gem_report_saved"));
    } catch {
      setState("error");
    }
  };

  return (
    <>
      <button type="button" className="text-xs font-semibold text-muted hover:text-ink underline underline-offset-4 min-h-[36px]" onClick={() => setOpen(true)}>
        {t("gem_report_link")}
      </button>
      {open && (
        <Modal title={t("gem_report_title")} onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <p className="text-sm">{t("gem_report_hint")}</p>
            <p className="flex flex-wrap gap-1.5 text-xs">
              <span className="chip !min-h-0 !py-0.5 de font-bold">{level}</span>
              {topic != null && <span className="chip !min-h-0 !py-0.5">{fill(t("gem_topic_n"), { n: topic })}</span>}
              {video && (
                <span className="chip !min-h-0 !py-0.5 de" dir="ltr">
                  🎬 {video}
                </span>
              )}
            </p>
            <textarea
              dir="auto"
              className="w-full min-h-[12rem] rounded-xl border border-line bg-surface p-3 text-sm leading-relaxed"
              placeholder={t("gem_report_placeholder")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label={t("gem_report_title")}
            />
            {state === "error" && <p className="text-sm text-danger">{t("gem_report_failed")}</p>}
            <button type="button" className="btn btn-primary w-full" onClick={() => void save()} disabled={!text.trim() || state === "saving"}>
              {state === "saving" ? t("loading") : t("gem_report_save")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
