"use client";

import Link from "next/link";
import { useTr, type Tri } from "@/components/public/kit";
import type { Level } from "@/lib/levels";
import { levelPath } from "@/lib/paths";

// 🎯 "What's your goal?" — a small mind map at the top of the home: the goal in the centre and two
// arrows. Travel / the Goethe exam → focus on writing and grammar. Speaking for daily life or work
// (call centres …) → focus on topics, conversation and listening. Every focus card opens that part.

type Focus = { icon: string; de: string; title: Tri; text: Tri; href: string; key?: boolean };
type Path = { id: string; color: string; soft: string; poster: string[]; tag: Tri; title: Tri; note: Tri; focus: Focus[] };

function paths(level: Level): Path[] {
  const lv = levelPath(level);
  return [
    {
      id: "exam",
      color: "#1d4ed8",
      soft: "#dbeafe",
      poster: ["✈️", "🏛️", "📝"],
      tag: { ar: "السفر أو امتحان Goethe", de: "Reisen oder Goethe-Prüfung", en: "Travel or the Goethe exam" },
      title: { ar: "عايز تسافر أو تاخد شهادة", de: "Du willst reisen oder ein Zertifikat", en: "You want to travel or get certified" },
      note: { ar: "الامتحان بيطلب كتابة سليمة وقواعد مظبوطة، فدول أهم حاجة عندك.", de: "Die Prüfung verlangt korrektes Schreiben und sichere Grammatik.", en: "The exam needs correct writing and solid grammar." },
      focus: [
        { icon: "✍️", de: "Schreiben", key: true, title: { ar: "الكتابة", de: "Schreiben", en: "Writing" }, text: { ar: "اكتب كل يوم وصحّح مع Gemini", de: "Täglich schreiben, mit Gemini korrigieren", en: "Write daily, correct with Gemini" }, href: `${lv}?skill=write` },
        { icon: "📘", de: "Grammatik", key: true, title: { ar: "القواعد", de: "Grammatik", en: "Grammar" }, text: { ar: "كل قاعدة في خريطة ذهنية", de: "Jede Regel als Mindmap", en: "Every rule as a mind map" }, href: `/grammar/${level}` },
        { icon: "📖", de: "Lesen & Hören", title: { ar: "القراءة والاستماع", de: "Lesen & Hören", en: "Reading & listening" }, text: { ar: "تكمّل باقي أجزاء الامتحان", de: "Für die anderen Prüfungsteile", en: "For the other exam parts" }, href: `${lv}?skill=read` },
      ],
    },
    {
      id: "speak",
      color: "#0f766e",
      soft: "#ccfbf1",
      poster: ["💬", "🎧", "📞"],
      tag: { ar: "الكلام والشغل (كول سنتر …)", de: "Sprechen und Arbeit (Callcenter …)", en: "Speaking and work (call centre …)" },
      title: { ar: "عايز تتكلم بطلاقة أو تشتغل بيها", de: "Du willst fließend sprechen oder damit arbeiten", en: "You want to speak fluently or work with it" },
      note: { ar: "الشغل بالكلام محتاج ودن وسرعة رد، فركّز على المحادثة والاستماع.", de: "Arbeit am Telefon braucht Ohr und schnelle Antworten.", en: "Phone work needs a good ear and quick answers." },
      focus: [
        { icon: "🗣️", de: "Themen", key: true, title: { ar: "المواضيع", de: "Themen", en: "Topics" }, text: { ar: "100 جملة لكل موضوع بصوتك", de: "100 Sätze pro Thema, laut", en: "100 sentences per topic, out loud" }, href: lv },
        { icon: "🎙️", de: "Gespräche", key: true, title: { ar: "المحادثة", de: "Gespräche", en: "Conversation" }, text: { ar: "Gemini Live والـ Sprachcafé", de: "Gemini Live und Sprachcafé", en: "Gemini Live and the Sprachcafé" }, href: "/sprachcafe" },
        { icon: "🎧", de: "Hören", key: true, title: { ar: "الاستماع", de: "Hören", en: "Listening" }, text: { ar: "Nicos Weg و Easy German", de: "Nicos Weg und Easy German", en: "Nicos Weg and Easy German" }, href: `${lv}?skill=listen` },
      ],
    },
  ];
}

function Branch({ p }: { p: Path }) {
  const tr = useTr();
  return (
    <article className="relative overflow-hidden rounded-[1.75rem] border bg-surface shadow-[var(--shadow)]" style={{ borderColor: `${p.color}33` }} data-testid={`goal-${p.id}`}>
      {/* poster */}
      <div className="relative h-32 overflow-hidden" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}bb)` }} aria-hidden="true">
        <div className="absolute -bottom-10 -start-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -top-12 end-10 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute inset-0 flex items-center justify-center gap-4 text-5xl drop-shadow-lg">
          {p.poster.map((e, i) => (
            <span key={e} style={{ transform: `translateY(${i === 1 ? -8 : 6}px) rotate(${(i - 1) * 8}deg)` }}>
              {e}
            </span>
          ))}
        </div>
      </div>
      <div className="p-5 sm:p-6 space-y-3">
        <span className="inline-block rounded-full px-3 py-1 text-xs font-extrabold" style={{ background: p.soft, color: p.color }}>
          {tr(p.tag)}
        </span>
        <h3 className="text-xl font-extrabold leading-snug">{tr(p.title)}</h3>
        <p className="text-sm text-muted leading-relaxed">{tr(p.note)}</p>
        <p className="pt-1 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: p.color }} lang="de">
          {tr({ ar: "ركّز على", de: "Dein Fokus", en: "Focus on" })}
        </p>
        <ul className="grid gap-2">
          {p.focus.map((f) => (
            <li key={f.de}>
              <Link href={f.href} className="group flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:-translate-y-0.5 hover:shadow-md" style={f.key ? { background: `color-mix(in oklab, ${p.color} 9%, transparent)` } : undefined}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-xl shadow-sm" aria-hidden="true">
                  {f.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-extrabold">{tr(f.title)}</span>
                    <span className="text-xs font-bold text-muted" lang="de">
                      {f.de}
                    </span>
                    {f.key && (
                      <span className="text-[11px] font-extrabold" style={{ color: p.color }}>
                        ★ {tr({ ar: "مهم جدًا", de: "sehr wichtig", en: "very important" })}
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-muted leading-snug">{tr(f.text)}</span>
                </span>
                <span className="text-muted transition group-hover:text-ink rtl:rotate-180" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** A curved arrow from the centre card to one branch (decorative, wide screens). */
function Arrow({ color, flip }: { color: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 80 60" className="hidden h-16 w-20 shrink-0 self-center lg:block" style={{ transform: flip ? "scaleX(-1)" : undefined }} aria-hidden="true">
      <path d="M78 30 C 50 30, 40 10, 10 12" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1 7" />
      <path d="M18 4 L6 12 L18 19" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GoalMap({ level }: { level: Level }) {
  const tr = useTr();
  const [exam, speak] = paths(level);
  return (
    <section aria-labelledby="goal-title" className="relative" data-testid="goal-map">
      <div className="flex flex-col items-stretch gap-5 lg:flex-row lg:items-center lg:gap-0">
        {/* In Arabic the first branch sits on the right (travel / exam), as asked. */}
        <div className="order-2 lg:order-none lg:flex-1">
          <Branch p={exam} />
        </div>
        <Arrow color={exam.color} flip />
        <div className="order-1 lg:order-none lg:w-72 shrink-0">
          <div className="rounded-[1.75rem] p-6 text-center text-white shadow-[0_24px_50px_-20px_rgba(91,33,182,.7)]" style={{ background: "linear-gradient(150deg, #7c3aed, #4c1d95)" }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] opacity-80" lang="de">
              Dein Ziel
            </p>
            <div className="mx-auto mt-3 grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-4xl" aria-hidden="true">
              🎯
            </div>
            <h2 id="goal-title" className="mt-3 text-3xl font-black">
              {tr({ ar: "هدفك إيه؟", de: "Was ist dein Ziel?", en: "What’s your goal?" })}
            </h2>
            <p className="mt-2 text-sm leading-relaxed opacity-90">
              {tr({ ar: "اختار طريقك، وركّز على اللي هيوصّلك أسرع.", de: "Wähle deinen Weg und konzentriere dich auf das, was dich schneller ans Ziel bringt.", en: "Pick your path and focus on what gets you there faster." })}
            </p>
            <div className="mt-4 flex justify-center gap-2 text-xs font-bold lg:hidden" aria-hidden="true">
              <span className="rounded-full bg-white/15 px-3 py-1">↓ ✈️</span>
              <span className="rounded-full bg-white/15 px-3 py-1">↓ 💬</span>
            </div>
          </div>
        </div>
        <Arrow color={speak.color} />
        <div className="order-3 lg:order-none lg:flex-1">
          <Branch p={speak} />
        </div>
      </div>
    </section>
  );
}
