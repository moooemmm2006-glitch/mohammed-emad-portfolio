"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/client/me";
import { LEVEL_CONFIG, LEVELS } from "@/lib/levels";
import { levelPath } from "@/lib/paths";
import { PLACEMENT, PASS_PER_LEVEL, placementResult } from "@/lib/placement";
import { PublicPage, useTr } from "./kit";

// 🎯 The placement test: one question at a time, then the start level, a score per level and the
// questions you missed with a short explanation. The result is remembered on this device.

const STORE = "sd_placement";

export function PlacementTest() {
  const tr = useTr();
  const { me } = useMe();
  const [answers, setAnswers] = useState<(number | null)[]>(() => PLACEMENT.map(() => null));
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const total = PLACEMENT.length;
  const q = PLACEMENT[i];
  const result = done ? placementResult(answers) : null;

  useEffect(() => {
    if (!result) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ level: result.level, at: Date.now() }));
    } catch {
      /* private mode */
    }
  }, [result]);

  const choose = (n: number) => {
    const next = [...answers];
    next[i] = n;
    setAnswers(next);
    window.setTimeout(() => (i + 1 < total ? setI(i + 1) : setDone(true)), 250);
  };
  const restart = () => {
    setAnswers(PLACEMENT.map(() => null));
    setI(0);
    setDone(false);
  };

  return (
    <PublicPage eyebrow="Einstufungstest" title={tr({ ar: "اختبار تحديد المستوى", de: "Einstufungstest", en: "Placement test" })} intro={tr({ ar: "20 سؤال سريع من A1 لحد B2 — في حوالي 5 دقايق تعرف تبدأ منين.", de: "20 kurze Fragen von A1 bis B2 – in etwa 5 Minuten weißt du, wo du startest.", en: "20 quick questions from A1 to B2 – in about 5 minutes you'll know where to start." })} testid="placement-page">
      {!started && !done && (
        <section className="card p-6 sm:p-8 space-y-4 text-center">
          <p className="text-5xl" aria-hidden="true">
            🎯
          </p>
          <ul className="text-start max-w-md mx-auto space-y-2 text-muted">
            <li>✓ {tr({ ar: "كل سؤال ليه 4 اختيارات، اختار واحد بس.", de: "Jede Frage hat 4 Antworten – wähle eine.", en: "Each question has 4 options – pick one." })}</li>
            <li>✓ {tr({ ar: "لو مش عارف، اختار «مش عارف» — ده أحسن من التخمين.", de: "Wenn du es nicht weißt, wähle „Weiß ich nicht“.", en: "If you don't know, choose “I don't know”." })}</li>
            <li>✓ {tr({ ar: "في الآخر هتشوف مستواك والأسئلة اللي غلطت فيها بالشرح.", de: "Am Ende siehst du dein Niveau und Erklärungen.", en: "At the end you'll see your level and explanations." })}</li>
          </ul>
          <button type="button" className="btn btn-primary !min-h-[50px] !px-8 text-lg" onClick={() => setStarted(true)} data-testid="placement-start">
            {tr({ ar: "يلا نبدأ", de: "Los geht's", en: "Let's go" })}
          </button>
        </section>
      )}

      {started && !done && (
        <section className="card p-5 sm:p-8 space-y-5" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <span className="tabular-nums">
              {i + 1} / {total}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white de" style={{ background: LEVEL_CONFIG[q.level].accent }}>
              {q.level}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(i / total) * 100}%` }} />
          </div>
          <p className="text-2xl sm:text-3xl font-bold de leading-snug" dir="ltr" lang="de" data-testid="placement-q">
            {q.de}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label={q.de}>
            {q.options.map((o, n) => (
              <button key={n} type="button" role="radio" aria-checked={answers[i] === n} onClick={() => choose(n)} className={`rounded-2xl border-2 px-4 min-h-[56px] text-lg font-semibold de text-start transition ${answers[i] === n ? "border-emerald-600 bg-emerald-500/10" : "border-line hover:border-emerald-500/50 hover:bg-surface-2"}`} dir="ltr" lang="de">
                {o}
              </button>
            ))}
            <button type="button" onClick={() => choose(-1)} className="sm:col-span-2 rounded-2xl border-2 border-dashed border-line px-4 min-h-[48px] text-muted hover:bg-surface-2">
              {tr({ ar: "مش عارف 🤷", de: "Weiß ich nicht 🤷", en: "I don't know 🤷" })}
            </button>
          </div>
          {i > 0 && (
            <button type="button" className="text-sm text-muted underline" onClick={() => setI(i - 1)}>
              {tr({ ar: "السؤال اللي فات", de: "Zurück", en: "Previous question" })}
            </button>
          )}
        </section>
      )}

      {result && (
        <>
          <section className="rounded-[2rem] p-6 sm:p-10 text-white text-center" style={{ background: `linear-gradient(135deg, ${LEVEL_CONFIG[result.level].accent}, #1f3a5f)` }} data-testid="placement-result">
            <p className="opacity-90">{tr({ ar: "ننصحك تبدأ من", de: "Wir empfehlen dir", en: "We recommend starting at" })}</p>
            <p className="text-7xl sm:text-8xl font-black de mt-2" lang="de">
              {result.level}
            </p>
            <p className="mt-3 opacity-90 max-w-lg mx-auto">{tr({ ar: "ده مجرد ترشيح عشان تبدأ صح. تقدر دايمًا ترجع لمستوى قبله تراجع، أو تتنقل بين المستويات.", de: "Nur eine Empfehlung – du kannst jederzeit wechseln.", en: "Just a recommendation – you can always switch levels." })}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {me ? (
                <Link href={levelPath(result.level)} className="btn !min-h-[50px] !px-7 bg-white !text-[#1f3a5f]">
                  {tr({ ar: `ابدأ ${result.level}`, de: `${result.level} starten`, en: `Start ${result.level}` })}
                </Link>
              ) : (
                <Link href="/signup" className="btn !min-h-[50px] !px-7 bg-white !text-[#1f3a5f]">
                  {tr({ ar: "اعمل حساب وابدأ", de: "Konto erstellen und starten", en: "Create an account and start" })}
                </Link>
              )}
              <button type="button" className="btn !min-h-[50px] border border-white/40 !text-white hover:bg-white/10" onClick={restart}>
                {tr({ ar: "عيد الاختبار", de: "Test wiederholen", en: "Retake the test" })}
              </button>
            </div>
          </section>

          <section className="card p-6 space-y-3">
            <h2 className="text-xl font-extrabold">{tr({ ar: "نتيجتك في كل مستوى", de: "Dein Ergebnis pro Niveau", en: "Your score per level" })}</h2>
            {LEVELS.map((l) => (
              <div key={l} className="flex items-center gap-3">
                <span className="w-10 font-black de" style={{ color: LEVEL_CONFIG[l].accent }}>
                  {l}
                </span>
                <div className="flex-1 h-3 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(result.perLevel[l] / 5) * 100}%`, background: LEVEL_CONFIG[l].accent }} />
                </div>
                <span className="w-14 text-end tabular-nums text-sm" dir="ltr">{result.perLevel[l]} / 5 {result.perLevel[l] >= PASS_PER_LEVEL ? "✓" : ""}</span>
              </div>
            ))}
          </section>

          {PLACEMENT.some((qq, n) => answers[n] !== qq.answer) && (
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold">{tr({ ar: "راجع اللي فاتك", de: "Das solltest du wiederholen", en: "Review what you missed" })}</h2>
              <ul className="space-y-2.5">
                {PLACEMENT.map((qq, n) =>
                  answers[n] === qq.answer ? null : (
                    <li key={n} className="card p-4 space-y-1.5">
                      <p className="font-bold de" dir="ltr" lang="de">
                        <span className="text-xs me-2 rounded px-1.5 py-0.5 text-white" style={{ background: LEVEL_CONFIG[qq.level].accent }}>
                          {qq.level}
                        </span>
                        {qq.de.replace("___", `【${qq.options[qq.answer]}】`)}
                      </p>
                      <p className="text-sm text-muted">{qq.why}</p>
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}
        </>
      )}
    </PublicPage>
  );
}
