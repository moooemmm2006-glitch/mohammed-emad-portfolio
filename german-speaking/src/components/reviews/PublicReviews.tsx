"use client";

import Link from "next/link";
import { Stars } from "@/components/sprachcafe/CafeReviews";
import { fill, localeOf } from "@/lib/client/i18n";
import { useMe } from "@/lib/client/me";
import { useUI } from "@/lib/client/ui";
import type { PublicReviews as Data } from "@/lib/publicReviews";

// ⭐ "الريفيوز": the approved opinions of the site, for everyone (also before logging in).

const ACCENT = "#7c3aed";

function Summary({ data, big = false }: { data: Data; big?: boolean }) {
  const { t } = useUI();
  if (!data.count || data.average == null) return <p className="text-sm text-muted">{t("rv_none_yet")}</p>;
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className={`${big ? "text-4xl" : "text-2xl"} font-black tabular-nums`}>{data.average.toFixed(1)}</span>
      <Stars value={data.average} size={big ? "text-2xl" : "text-lg"} />
      <span className="text-sm text-muted">{fill(t("lrev_count"), { n: data.count })}</span>
    </p>
  );
}

function Card({ r, className = "" }: { r: Data["reviews"][number]; className?: string }) {
  const { t, lang } = useUI();
  return (
    <li className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 flex flex-col gap-3 ${className}`}>
      <Stars value={r.rating} />
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words grow" dir="auto">
        {r.comment}
      </p>
      <div className="flex items-center gap-2.5 pt-2 border-t border-line/70">
        <span className="grid place-items-center w-9 h-9 rounded-full text-sm font-black text-white shrink-0" style={{ background: ACCENT }} aria-hidden="true">
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
  );
}

/** The full public page. */
export function PublicReviewsPage({ data }: { data: Data }) {
  const { t } = useUI();
  const { me } = useMe();
  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="public-reviews">
      <header className="card p-6 sm:p-8 border-2" style={{ borderColor: `color-mix(in oklab, ${ACCENT} 35%, transparent)`, background: `linear-gradient(135deg, color-mix(in oklab, ${ACCENT} 8%, var(--surface)), var(--surface) 65%)` }}>
        <p className="text-xs font-bold tracking-widest uppercase de" style={{ color: ACCENT }} lang="de">
          Bewertungen
        </p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold">{t("rv_page_title")}</h1>
        <p className="mt-2 text-muted max-w-2xl">{t("rv_page_sub")}</p>
        <div className="mt-4">
          <Summary data={data} big />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {me ? (
            <Link href="/#site-reviews" className="btn btn-primary">
              {t("lrev_write")}
            </Link>
          ) : (
            <>
              <Link href="/signup" className="btn btn-primary">
                {t("rv_cta_signup")}
              </Link>
              <Link href="/login" className="btn btn-ghost">
                {t("auth_submit_login")}
              </Link>
            </>
          )}
        </div>
      </header>
      {data.reviews.length > 0 && (
        <ul className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.reviews.map((r) => (
            <Card key={r.id} r={r} />
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">{t("rv_honest_note")}</p>
    </div>
  );
}

/** A short strip under the login / sign-up form. */
export function ReviewsStrip({ data }: { data: Data }) {
  const { t } = useUI();
  return (
    <section className="max-w-3xl mx-auto mt-8 space-y-3" aria-labelledby="strip-title" data-testid="reviews-strip">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <h2 id="strip-title" className="text-lg font-extrabold">
            {t("rv_page_title")}
          </h2>
          <Summary data={data} />
        </div>
        <Link href="/reviews" className="text-sm font-bold underline" style={{ color: ACCENT }}>
          {t("rv_see_all")}
        </Link>
      </div>
      {data.reviews.length > 0 && (
        <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2">
          {data.reviews.slice(0, 6).map((r) => (
            <Card key={r.id} r={r} className="snap-start shrink-0 w-[85%] sm:w-[300px]" />
          ))}
        </ul>
      )}
    </section>
  );
}
