"use client";

import Link from "next/link";
import { IntroVideoPoster } from "@/components/site/IntroVideo";
import { IconSprachcafe } from "@/components/Icons";
import { Stars } from "@/components/sprachcafe/CafeReviews";
import { LEVEL_CONFIG, LEVELS } from "@/lib/levels";
import type { PublicReviews } from "@/lib/publicReviews";
import { useUI } from "@/lib/client/ui";
import type { TKey } from "@/lib/client/i18n";
import { Eyebrow, StartBand, useTr } from "./kit";

// 🌍 The public front door for visitors (logged-in learners see their own home at "/").
// What the site is, how it works, the levels, what learners say, and two ways in.

export function Landing({ reviews }: { reviews: PublicReviews }) {
  const { t } = useUI();
  const tr = useTr();
  const features = [
    { icon: "🗣️", c: "#2563eb", title: { ar: "اتكلم من أول يوم", de: "Vom ersten Tag an sprechen", en: "Speak from day one" }, text: { ar: "100 جملة في كل موضوع، تسمعها وتقولها بصوتك والموقع يصحّحلك.", de: "100 Sätze pro Thema – hören, nachsprechen, Feedback bekommen.", en: "100 sentences per topic – listen, say them, get feedback." } },
    { icon: "🎙️", c: "#7c3aed", title: { ar: "محادثة مع Gemini", de: "Gespräch mit Gemini", en: "Talk with Gemini" }, text: { ar: "محادثة صوتية بالألماني بمستواك بالظبط، وتقرير بأخطاءك في الآخر.", de: "Sprachgespräch genau auf deinem Niveau – mit Fehlerbericht am Ende.", en: "Voice chat at exactly your level – with a mistakes report at the end." } },
    { icon: "🗺️", c: "#0f766e", title: { ar: "خطة يوم بيوم", de: "Plan Tag für Tag", en: "A day-by-day plan" }, text: { ar: "كل موضوع في يومين، بالترتيب، لحد ما تخلّص المستوى.", de: "Jedes Thema in zwei Tagen, der Reihe nach, bis zum Ziel.", en: "Each topic in two days, in order, to the end of the level." } },
    { icon: "🎧", c: "#dc2626", title: { ar: "فيديوهات حقيقية", de: "Echte Videos", en: "Real videos" }, text: { ar: "Nicos Weg و Easy German، والموقع بيفتكر وقفت فين.", de: "Nicos Weg und Easy German – die Seite merkt sich, wo du warst.", en: "Nicos Weg and Easy German – the site remembers where you stopped." } },
    { icon: "👥", c: "#059669", title: { ar: "مش لوحدك", de: "Nicht allein", en: "Not alone" }, text: { ar: "غرف مذاكرة بالصوت والشات، وجلسات محادثة في شبراخ كافيه.", de: "Lernräume mit Audio und Chat, Gesprächsrunden im Sprachcafé.", en: "Study rooms with voice and chat, sessions in the Sprachcafé." } },
    { icon: "⏱️", c: "#ea580c", title: { ar: "تركيز وتحفيز", de: "Fokus und Motivation", en: "Focus and motivation" }, text: { ar: "تايمر مذاكرة، خزنة لوقتك، شارات، وكوميكس بعد كل خطوة.", de: "Lern-Timer, Zeit-Tresor, Abzeichen und Comics nach jedem Schritt.", en: "Study timer, a time vault, badges and comics after each step." } },
  ];
  const steps = [
    { n: "1", title: { ar: "اختار مستواك", de: "Niveau wählen", en: "Pick your level" }, text: { ar: "من A1 لحد B2، ابدأ من المستوى اللي يناسبك.", de: "Von A1 bis B2 – starte auf deinem Niveau.", en: "From A1 to B2 – start at the level that fits you." } },
    { n: "2", title: { ar: "ابدأ خطتك", de: "Plan starten", en: "Start your plan" }, text: { ar: "اختار يوم البداية، والخطة ترتّبلك كل يوم.", de: "Startdatum wählen – der Plan ordnet jeden Tag.", en: "Pick a start day – the plan arranges every day." } },
    { n: "3", title: { ar: "اتكلم كل يوم", de: "Jeden Tag sprechen", en: "Speak every day" }, text: { ar: "جمل، Gemini، فيديو، وكتابة… خطوة صغيرة كل يوم.", de: "Sätze, Gemini, Video, Schreiben – jeden Tag ein Schritt.", en: "Sentences, Gemini, video, writing – a small step daily." } },
  ];
  return (
    <div className="max-w-6xl mx-auto space-y-14 sm:space-y-20 pb-6" data-testid="landing">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-[2rem] p-7 sm:p-12 text-white" style={{ background: "linear-gradient(135deg,#0f172a 0%,#1f3a5f 50%,#0f766e 100%)" }}>
        <div className="absolute -top-32 -start-24 w-96 h-96 rounded-full opacity-30" style={{ background: "radial-gradient(circle,#22d3ee,transparent 70%)" }} aria-hidden="true" />
        <div className="absolute -bottom-40 end-10 w-96 h-96 rounded-full opacity-30" style={{ background: "radial-gradient(circle,#a855f7,transparent 70%)" }} aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
          <div>
            <Eyebrow color="#a5f3fc">Sprich Deutsch</Eyebrow>
            <h1 className="mt-3 text-4xl sm:text-6xl font-extrabold leading-[1.15]">
              {tr({ ar: "اتكلم ألماني", de: "Sprich Deutsch", en: "Speak German" })}
              <br />
              <span className="bg-gradient-to-l from-yellow-300 to-rose-400 bg-clip-text text-transparent">{tr({ ar: "من A1 لحد B2", de: "von A1 bis B2", en: "from A1 to B2" })}</span>
            </h1>
            <p className="mt-4 text-lg sm:text-xl opacity-90 leading-relaxed max-w-xl">
              {tr({ ar: "مكان واحد بالمصري فيه كل اللي محتاجه عشان تتكلم ألماني بجد: جمل تقولها بصوتك، محادثة مع Gemini، فيديوهات، قواعد، وخطة يوم بيوم.", de: "Alles an einem Ort, um wirklich Deutsch zu sprechen: Sätze laut sprechen, Gespräche mit Gemini, Videos, Grammatik und ein Plan Tag für Tag.", en: "Everything in one place to really speak German: say sentences out loud, talk with Gemini, videos, grammar and a day-by-day plan." })}
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/signup" className="btn !min-h-[50px] !px-7 bg-white !text-[#1f3a5f] hover:brightness-95 text-lg" data-testid="landing-signup">
                {tr({ ar: "ابدأ مجانًا", de: "Kostenlos starten", en: "Start for free" })}
              </Link>
              <Link href="/login" className="btn !min-h-[50px] !text-white/90 hover:bg-white/10">
                {t("login_button")}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4" dir="ltr" aria-hidden="true">
            {LEVELS.map((l) => (
              <div key={l} className="rounded-3xl grid place-items-center aspect-[4/3] text-4xl sm:text-6xl font-black de shadow-xl" style={{ background: LEVEL_CONFIG[l].accent }}>
                {l}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1.5 flex" dir="ltr" aria-hidden="true">
          <span className="flex-1 bg-[#111]" />
          <span className="flex-1 bg-[#dd0000]" />
          <span className="flex-1 bg-[#ffce00]" />
        </div>
      </section>

      {/* ── Intro video ── */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-center" aria-labelledby="intro-title" data-testid="intro-video">
        <div className="space-y-4">
          <Eyebrow>Willkommen</Eyebrow>
          <h2 id="intro-title" className="text-2xl sm:text-3xl font-extrabold">
            {t("intro_title")}
          </h2>
          <p className="text-muted leading-relaxed">{t("intro_sub")}</p>
          <ul className="space-y-2.5">
            {(["intro_point_1", "intro_point_2", "intro_point_3"] as const).map((k) => (
              <li key={k} className="flex items-start gap-2.5">
                <span className="mt-1 grid place-items-center w-5 h-5 shrink-0 rounded-full bg-emerald-600 text-white text-[11px] font-bold" aria-hidden="true">
                  ✓
                </span>
                <span className="leading-relaxed">{t(k)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t("intro_consent")}</p>
        </div>
        <IntroVideoPoster />
      </section>

      {/* ── Features ── */}
      <section aria-labelledby="f-title" className="space-y-5">
        <div className="text-center max-w-2xl mx-auto">
          <Eyebrow>Alles an einem Ort</Eyebrow>
          <h2 id="f-title" className="mt-2 text-3xl sm:text-4xl font-extrabold">
            {tr({ ar: "كل اللي محتاجه… في مكان واحد", de: "Alles, was du brauchst", en: "Everything you need, in one place" })}
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.icon} className="card p-5 sm:p-6 space-y-2.5" style={{ borderTop: `4px solid ${f.c}` }}>
              <span className="grid place-items-center w-12 h-12 rounded-2xl text-2xl" style={{ background: `color-mix(in oklab, ${f.c} 14%, transparent)` }} aria-hidden="true">
                {f.icon}
              </span>
              <h3 className="text-lg font-extrabold">{tr(f.title)}</h3>
              <p className="text-muted leading-relaxed">{tr(f.text)}</p>
            </li>
          ))}
        </ul>
        <p className="text-center text-sm text-muted flex items-center justify-center gap-2">
          <IconSprachcafe size={18} /> {tr({ ar: "وكمان: قراءة، كتابة بتقرير من Gemini، كتاب قواعد، وريفيوز من الطلاب.", de: "Außerdem: Lesen, Schreiben mit Gemini-Bericht, Grammatikbuch und Bewertungen.", en: "Plus: reading, writing with a Gemini report, a grammar book and learner reviews." })}
        </p>
      </section>

      {/* ── Levels ── */}
      <section aria-labelledby="lv-title" className="space-y-5">
        <div className="text-center">
          <Eyebrow>Die Niveaus</Eyebrow>
          <h2 id="lv-title" className="mt-2 text-3xl sm:text-4xl font-extrabold">
            {tr({ ar: "4 مستويات… 100 موضوع", de: "4 Niveaus – 100 Themen", en: "4 levels – 100 topics" })}
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((l, i) => (
            <li key={l} className="rounded-3xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(160deg, ${LEVEL_CONFIG[l].accent}, ${LEVEL_CONFIG[l].accent}cc)` }}>
              <p className="text-4xl font-black de" lang="de">
                {l}
              </p>
              <p className="mt-1 text-lg font-extrabold">{t(`lvl_${l}_name` as TKey)}</p>
              <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-0.5 text-sm font-bold">{[15, 25, 30, 30][i]} {tr({ ar: "موضوع", de: "Themen", en: "topics" })}</span>
              <p className="mt-3 text-sm leading-relaxed opacity-95 line-clamp-3">{t(`lvl_${l}_desc` as TKey)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── How it works ── */}
      <section aria-labelledby="how-title" className="space-y-5">
        <div className="text-center">
          <Eyebrow>So geht&apos;s</Eyebrow>
          <h2 id="how-title" className="mt-2 text-3xl sm:text-4xl font-extrabold">
            {tr({ ar: "تبدأ إزاي؟", de: "Wie fange ich an?", en: "How do I start?" })}
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="card p-6 text-center space-y-2">
              <span className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-[#1f3a5f] text-white text-2xl font-black de">{s.n}</span>
              <h3 className="text-xl font-extrabold">{tr(s.title)}</h3>
              <p className="text-muted">{tr(s.text)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── What learners say ── */}
      {reviews.count > 0 && (
        <section aria-labelledby="rv-title" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow color="#7c3aed">Bewertungen</Eyebrow>
              <h2 id="rv-title" className="mt-2 text-3xl sm:text-4xl font-extrabold">
                {tr({ ar: "الطلاب بيقولوا إيه", de: "Was Lernende sagen", en: "What learners say" })}
              </h2>
            </div>
            {reviews.average != null && (
              <p className="flex items-center gap-2">
                <span className="text-3xl font-black tabular-nums">{reviews.average.toFixed(1)}</span>
                <Stars value={reviews.average} size="text-lg" />
                <a href="/reviews" className="text-sm font-bold underline text-[#7c3aed]">
                  {tr({ ar: `كل الريفيوز (${reviews.count})`, de: `Alle (${reviews.count})`, en: `All (${reviews.count})` })}
                </a>
              </p>
            )}
          </div>
          <ul className="grid gap-3 md:grid-cols-3">
            {reviews.reviews.slice(0, 3).map((r) => (
              <li key={r.id} className="card p-5 flex flex-col gap-3">
                <Stars value={r.rating} />
                <p className="leading-relaxed flex-1 break-words" dir="auto">
                  “{r.comment}”
                </p>
                <p className="text-sm font-bold">— {r.name}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StartBand />
    </div>
  );
}
