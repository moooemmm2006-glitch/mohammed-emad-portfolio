"use client";

import { Eyebrow, useTr, type Tri } from "@/components/public/kit";
import { IconSprachcafe } from "@/components/Icons";
import { LEVEL_CONFIG, LEVELS } from "@/lib/levels";

// 🏛 A calm, professional "what the platform is" block (replaces the intro video): the four pillars of
// the method beside an illustrated preview of the app (drawn in HTML, no screenshots, no people).

const PILLARS: { icon: string; c: string; title: Tri; text: Tri }[] = [
  { icon: "🧭", c: "#1f3a5f", title: { ar: "منهج منظّم من A1 لحد B2", de: "Strukturierter Weg von A1 bis B2", en: "A structured path from A1 to B2" }, text: { ar: "مستويات مبنية على الإطار الأوروبي المرجعي (CEFR)، وكل مستوى ليه مواضيعه.", de: "Niveaus nach dem Gemeinsamen Europäischen Referenzrahmen, jedes mit eigenen Themen.", en: "Levels based on the CEFR, each with its own topics." } },
  { icon: "🗓️", c: "#0f766e", title: { ar: "خطة يومية ومتابعة تقدّم", de: "Tagesplan und Fortschritt", en: "Daily plan and progress" }, text: { ar: "خطوة واضحة كل يوم، والتقدّم بيتحسب لوحده في المهارات الأربعة.", de: "Jeden Tag ein klarer Schritt – der Fortschritt in allen vier Fertigkeiten zählt automatisch.", en: "A clear step every day, with progress tracked across all four skills." } },
  { icon: "🗣️", c: "#b45309", title: { ar: "محادثة حقيقية", de: "Echte Gespräche", en: "Real conversation" }, text: { ar: "جلسات Sprachcafé أونلاين في مجموعات صغيرة، وغرف مذاكرة مع طلاب تانيين.", de: "Sprachcafé-Runden online in kleinen Gruppen und Lernräume mit anderen.", en: "Online Sprachcafé sessions in small groups, plus study rooms with others." } },
  { icon: "📚", c: "#7c3aed", title: { ar: "مصادر موثوقة", de: "Verlässliche Quellen", en: "Trusted sources" }, text: { ar: "فيديوهات DW و Easy German وقواعد مشروحة بأمثلة وتدريب عملي.", de: "Videos von DW und Easy German, Grammatik mit Beispielen und Übungen.", en: "DW and Easy German videos, grammar with examples and practice." } },
];

export function PlatformShowcase() {
  const tr = useTr();
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center" aria-labelledby="platform-title" data-testid="platform-showcase">
      <div className="space-y-5">
        <div className="space-y-2">
          <Eyebrow>Die Plattform</Eyebrow>
          <h2 id="platform-title" className="text-2xl sm:text-3xl font-extrabold leading-tight">
            {tr({ ar: "منصة متكاملة لتعلّم الكلام بالألماني", de: "Eine Plattform, um wirklich Deutsch zu sprechen", en: "One platform to really speak German" })}
          </h2>
          <p className="text-muted leading-relaxed">
            {tr({ ar: "كل اللي الطالب محتاجه في مكان واحد منظم: منهج، وخطة، وممارسة، ومتابعة. بيشتغل على الموبايل والكمبيوتر، بالعربي والألماني والإنجليزي.", de: "Alles an einem geordneten Ort: Lernweg, Plan, Übung und Fortschritt – auf Handy und Computer, auf Arabisch, Deutsch und Englisch.", en: "Everything in one organised place: curriculum, plan, practice and progress – on phone and computer, in Arabic, German and English." })}
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <li key={p.icon} className="card p-4 space-y-1.5" style={{ borderInlineStart: `4px solid ${p.c}` }}>
              <span className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">{p.icon}</span>
                <span className="font-extrabold leading-snug">{tr(p.title)}</span>
              </span>
              <span className="block text-sm text-muted leading-relaxed">{tr(p.text)}</span>
            </li>
          ))}
        </ul>
      </div>
      <AppPreview />
    </section>
  );
}

/** An illustrated, non-interactive preview of the app (sample values, for illustration only). */
function AppPreview() {
  const tr = useTr();
  const sample = [72, 45, 20, 8];
  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute -inset-4 rounded-[2.5rem] opacity-60 blur-2xl" style={{ background: "radial-gradient(circle at 30% 30%, #99f6e4, transparent 60%), radial-gradient(circle at 80% 70%, #fde68a, transparent 55%)" }} />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(15,31,53,.45)]">
        <div className="flex items-center gap-1.5 border-b border-line bg-surface-2/70 px-4 py-2.5" dir="ltr">
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="mx-auto rounded-full bg-surface px-3 py-0.5 text-[11px] text-muted">german-speaking.vercel.app</span>
        </div>
        <div className="grid gap-3 p-4 sm:p-5">
          <div className="rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #1f3a5f, #0f766e)" }}>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase opacity-80" lang="de">Heute</p>
            <p className="mt-1 font-extrabold">{tr({ ar: "خطة النهارده: الموضوع 6", de: "Plan für heute: Thema 6", en: "Today’s plan: topic 6" })}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {[{ ar: "🗣️ جمل", de: "🗣️ Sätze", en: "🗣️ Sentences", done: true }, { ar: "🎧 سماع", de: "🎧 Hören", en: "🎧 Listening", done: true }, { ar: "✍️ كتابة", de: "✍️ Schreiben", en: "✍️ Writing", done: false }].map((s) => (
                <span key={s.en} className={`rounded-full px-2.5 py-1 font-bold ${s.done ? "bg-white/90 text-[#0f766e]" : "bg-white/15"}`}>
                  {s.done ? "✓ " : ""}
                  {tr(s)}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm font-extrabold">{tr({ ar: "التقدّم في المستويات", de: "Fortschritt je Niveau", en: "Progress by level" })}</p>
            <ul className="mt-3 space-y-2.5">
              {LEVELS.map((l, i) => (
                <li key={l} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-extrabold de" style={{ color: LEVEL_CONFIG[l].accent }}>{l}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full" style={{ width: `${sample[i]}%`, background: LEVEL_CONFIG[l].accent }} />
                  </span>
                  <span className="w-9 text-end text-xs text-muted" dir="ltr">{sample[i]}%</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-slate-950"><IconSprachcafe size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">Sprachcafé · B1</span>
              <span className="block text-xs text-muted">{tr({ ar: "جلسة محادثة على Google Meet · 6 طلاب", de: "Gesprächsrunde auf Google Meet · 6 Personen", en: "Conversation on Google Meet · 6 learners" })}</span>
            </span>
            <span className="rounded-full bg-[#1f3a5f] px-3 py-1 text-xs font-bold text-white">{tr({ ar: "احجز", de: "Buchen", en: "Book" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
