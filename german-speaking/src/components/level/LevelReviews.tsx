"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stars } from "@/components/sprachcafe/CafeReviews";
import { ApiError, api } from "@/lib/client/api";
import { fill, localeOf } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { LEVEL_CONFIG, type Level } from "@/lib/levels";

export type ReviewTarget = Level | "SITE";
const SITE_ACCENT = "#7c3aed";

// 💬 "آراء الطلاب": a swipeable reel of what learners say about a level — or about the whole site
// (level "SITE", shown at the top of the front page) — approved by the admin, and a short form to add
// your own (for a level: once you worked on it; for the site: any learner).

type Review = { id: string; rating: number; comment: string; name: string; level: string; at: number };
type Data = { average: number | null; count: number; reviews: Review[]; mine: { rating: number; comment: string; status: "pending" | "approved" | "rejected" } | null; progress: number; minProgress: number; canWrite: boolean };

const MIN = 10;
const MAX = 400;

export function LevelReviews({ level }: { level: ReviewTarget }) {
  const { t, lang } = useUI();
  const site = level === "SITE";
  const accent = site ? SITE_ACCENT : LEVEL_CONFIG[level].accent;
  const title = site ? t("lrev_site_title") : fill(t("lrev_title"), { level });
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [writing, setWriting] = useState(false);
  const reel = useRef<HTMLUListElement>(null);
  const load = useCallback(() => {
    setFailed(false);
    return api<Data>(`/api/level-reviews?level=${level}`).then(setData, () => setFailed(true));
  }, [level]);
  useEffect(() => {
    setData(null);
    void load();
  }, [load]);

  // Never disappear: while loading (or if loading failed) the section still shows its title.
  if (!data) {
    return (
      <section id={site ? "site-reviews" : "reviews"} className="card p-4 sm:p-6 space-y-3 scroll-mt-28" aria-labelledby={`reviews-title-${level}`} data-testid={site ? "site-reviews" : "level-reviews"}>
        <h2 id={`reviews-title-${level}`} className="text-xl sm:text-2xl font-extrabold">
          {title}
        </h2>
        {failed ? (
          <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
            {t("lrev_load_failed")}
            <button type="button" className="btn btn-ghost !min-h-[38px]" onClick={() => void load()}>
              {t("lrev_retry")}
            </button>
          </p>
        ) : (
          <div className="h-24 rounded-2xl bg-surface-2 animate-pulse" aria-hidden="true" />
        )}
      </section>
    );
  }

  const scroll = (dir: 1 | -1) => {
    const el = reel.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * Math.min(el.clientWidth * 0.85, 360), behavior: "smooth" });
  };

  return (
    <section
      id={site ? "site-reviews" : "reviews"}
      className={`card p-4 sm:p-6 space-y-5 overflow-hidden scroll-mt-28 ${site ? "border-2" : ""}`}
      style={site ? { borderColor: `color-mix(in oklab, ${accent} 35%, transparent)`, background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 7%, var(--surface)), var(--surface) 60%)` } : undefined}
      aria-labelledby={`reviews-title-${level}`}
      data-testid={site ? "site-reviews" : "level-reviews"}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase de" style={{ color: accent }} lang="de">
            Stimmen
          </p>
          <h2 id={`reviews-title-${level}`} className="text-xl sm:text-2xl font-extrabold mt-1">
            {title}
          </h2>
          {data.count > 0 && data.average != null ? (
            <p className="mt-1 flex items-center gap-2 text-sm">
              <span className="text-lg font-black tabular-nums">{data.average.toFixed(1)}</span>
              <Stars value={data.average} />
              <span className="text-muted">{fill(t("lrev_count"), { n: data.count })}</span>
            </p>
          ) : (
            <p className="text-sm text-muted mt-1">{site ? t("lrev_site_empty") : t("lrev_empty")}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data.reviews.length > 1 && (
            <span className="hidden sm:flex gap-1.5">
              <button type="button" className="grid place-items-center w-10 h-10 rounded-full border border-line hover:bg-surface-2 rtl:rotate-180" onClick={() => scroll(-1)} aria-label={t("lrev_prev")}>
                ←
              </button>
              <button type="button" className="grid place-items-center w-10 h-10 rounded-full border border-line hover:bg-surface-2 rtl:rotate-180" onClick={() => scroll(1)} aria-label={t("lrev_next")}>
                →
              </button>
            </span>
          )}
          {data.canWrite && !writing && (
            <button type="button" className="btn btn-primary !min-h-[42px]" onClick={() => setWriting(true)}>
              {data.mine ? t("lrev_edit") : t("lrev_write")}
            </button>
          )}
        </div>
      </div>

      {data.reviews.length > 0 && (
        <ul ref={reel} className="level-reviews-reel -mx-4 sm:-mx-6 px-4 sm:px-6 flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2" aria-label={title}>
          {data.reviews.map((r) => (
            <li key={r.id} className="snap-start shrink-0 w-[85%] min-[480px]:w-[300px] sm:w-[340px] rounded-2xl border border-line bg-surface-2/50 p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <Stars value={r.rating} />
                <span className="text-4xl leading-none font-serif" style={{ color: accent }} aria-hidden="true">
                  ”
                </span>
              </div>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words grow" dir="auto">
                {r.comment}
              </p>
              <div className="flex items-center gap-2.5 pt-1 border-t border-line/70">
                <span className="grid place-items-center w-9 h-9 rounded-full text-sm font-black text-white shrink-0" style={{ background: accent }} aria-hidden="true">
                  {r.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold truncate">{r.name}</span>
                  <span className="block text-xs text-muted">
                    {r.level === "SITE" ? t("lrev_student_site") : fill(t("lrev_student_of"), { level: r.level })} · {new Date(r.at).toLocaleDateString(localeOf(lang), { month: "short", year: "numeric" })}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {site && (
        <p className="text-sm">
          <a href="/reviews" className="font-bold underline" style={{ color: accent }}>
            {t("rv_see_all")}
          </a>
        </p>
      )}
      {data.mine && !writing && (
        <p className="text-sm rounded-xl bg-surface-2 px-3 py-2" role="status">
          {t(data.mine.status === "approved" ? "lrev_mine_approved" : data.mine.status === "rejected" ? "lrev_mine_rejected" : "lrev_mine_pending")}
        </p>
      )}
      {!data.canWrite && (
        <p className="text-sm text-muted">{fill(t("lrev_locked"), { min: data.minProgress, p: data.progress })}</p>
      )}
      {writing && (
        <LevelReviewForm
          level={level}
          initial={data.mine}
          onCancel={() => setWriting(false)}
          onDone={() => {
            setWriting(false);
            void load();
          }}
        />
      )}
    </section>
  );
}

function LevelReviewForm({ level, initial, onDone, onCancel }: { level: ReviewTarget; initial: Data["mine"]; onDone: () => void; onCancel: () => void }) {
  const { t } = useUI();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const len = comment.trim().length;
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/api/level-reviews", { method: "POST", body: JSON.stringify({ level, rating, comment }) });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError && e.code === "not_enough_progress" ? fill(t("lrev_locked_short"), { min: e.message }) : t("lrev_failed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-line p-4 space-y-3" data-testid="level-review-form">
      <p className="font-bold">{level === "SITE" ? t("lrev_site_form_title") : fill(t("lrev_form_title"), { level })}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={t("lrev_stars")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}/5`} className={`grid place-items-center w-11 h-11 rounded-xl text-2xl transition ${n <= rating ? "text-amber-500" : "text-line hover:text-amber-300"}`} onClick={() => setRating(n)}>
            ★
          </button>
        ))}
      </div>
      <textarea className="field min-h-[96px]" dir="auto" maxLength={MAX} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("lrev_ph")} aria-label={t("lrev_ph")} />
      <p className="text-xs text-muted tabular-nums">
        {len}/{MAX} · {t("lrev_note")}
      </p>
      {error && <p className="text-danger text-sm">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary !min-h-[42px]" disabled={busy || rating === 0 || len < MIN} onClick={() => void send()}>
          {busy ? t("loading") : t("lrev_send")}
        </button>
        <button type="button" className="btn btn-ghost !min-h-[42px]" onClick={onCancel}>
          {t("me_cancel")}
        </button>
      </div>
    </div>
  );
}
