"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/client/api";
import { localeOf } from "@/lib/client/i18n";
import { useMe } from "@/lib/client/me";
import { useUI } from "@/lib/client/ui";
import { cafeText } from "@/lib/sprachcafe/labels";

// ⭐ Reviews of a Sprachcafé teacher's past sessions (written by learners who attended), and the form
// a learner fills in after a session they booked.

type Review = { id: string; rating: number; comment: string; createdAt: number; name: string; session: { id: string; title: string; startsAt: number } | null };

export function Stars({ value, size = "text-base" }: { value: number; size?: string }) {
  const full = Math.round(value);
  return (
    <span className={`${size} tracking-tight text-amber-500`} aria-hidden="true">
      {"★".repeat(full)}
      <span className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}

/** Small "⭐ 4.6 (12)" for cards. */
export function RatingBadge({ rating }: { rating?: { average: number | null; count: number } }) {
  const { t } = useUI();
  if (!rating?.count || rating.average == null) return <span className="text-xs text-muted">{cafeText(t, "reviews_none_short")}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold" aria-label={cafeText(t, "reviews_aria", { a: rating.average, n: rating.count })}>
      <span className="text-amber-500" aria-hidden="true">
        ★
      </span>
      {rating.average.toFixed(1)} <span className="font-normal text-muted">({rating.count})</span>
    </span>
  );
}

export function CafeReviews({ teacherId }: { teacherId: string }) {
  const { t, lang } = useUI();
  const { me } = useMe();
  const [data, setData] = useState<{ average: number | null; count: number; reviews: Review[] } | null>(null);
  const load = useCallback(() => api<{ average: number | null; count: number; reviews: Review[] }>(`/api/sprachcafe/reviews?teacher=${encodeURIComponent(teacherId)}`).then(setData, () => setData({ average: null, count: 0, reviews: [] })), [teacherId]);
  useEffect(() => void load(), [load]);
  const remove = async (id: string) => {
    if (!window.confirm(cafeText(t, "review_delete_confirm"))) return;
    await api(`/api/sprachcafe/reviews?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    await load();
  };
  if (!data) return null;
  return (
    <section id="reviews" className="scroll-mt-24 space-y-4" data-testid="cafe-reviews">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold">{cafeText(t, "reviews_title")}</h2>
        {data.count > 0 && data.average != null && (
          <p className="flex items-center gap-2">
            <span className="text-3xl font-black tabular-nums">{data.average.toFixed(1)}</span>
            <Stars value={data.average} size="text-xl" />
            <span className="text-sm text-muted">{cafeText(t, "reviews_count", { n: data.count })}</span>
          </p>
        )}
      </div>
      {data.reviews.length === 0 ? (
        <p className="card p-5 text-muted">{cafeText(t, "reviews_empty")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.reviews.map((r) => (
            <li key={r.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{r.name}</p>
                <Stars value={r.rating} />
              </div>
              {r.comment && (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words" dir="auto">
                  {r.comment}
                </p>
              )}
              <p className="text-xs text-muted">
                {r.session?.title ? `${r.session.title} · ` : ""}
                {new Date(r.session?.startsAt ?? r.createdAt).toLocaleDateString(localeOf(lang), { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {me?.user.role === "admin" && (
                <button type="button" className="text-xs text-danger underline min-h-[32px]" onClick={() => void remove(r.id)}>
                  {cafeText(t, "review_delete")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "قيّم الجلسة": stars + an optional comment, for a session the learner attended. */
export function ReviewForm({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const { t } = useUI();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/api/sprachcafe/reviews", { method: "POST", body: JSON.stringify({ sessionId, rating, comment }) });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError && e.code === "already_reviewed" ? cafeText(t, "review_already") : cafeText(t, "review_failed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3" data-testid="review-form">
      <p className="font-bold">{cafeText(t, "review_title")}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={cafeText(t, "review_title")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n}/5`}
            className={`grid place-items-center w-11 h-11 rounded-xl text-2xl transition ${n <= rating ? "text-amber-500" : "text-line hover:text-amber-300"}`}
            onClick={() => setRating(n)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea className="field min-h-[80px]" dir="auto" maxLength={600} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={cafeText(t, "review_ph")} />
      {error && <p className="text-danger text-sm">{error}</p>}
      <button type="button" className="btn btn-primary !min-h-[42px]" disabled={busy || rating === 0} onClick={() => void send()}>
        {busy ? cafeText(t, "loading") : cafeText(t, "review_send")}
      </button>
    </div>
  );
}
