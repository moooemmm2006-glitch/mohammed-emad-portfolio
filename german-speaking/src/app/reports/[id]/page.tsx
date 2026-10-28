"use client";

import { levelPath } from "@/lib/paths";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { IconMic, IconRepeat, IconSparkle, IconTrash } from "@/components/Icons";
import { ApiError, api } from "@/lib/client/api";
import { localeOf, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { isLevel, type Level } from "@/lib/levels";
import { ScoreKeys, type StoredReport } from "@/lib/report/schema";
import { BookReportSection } from "@/components/book/BookReportSection";
import { aiChatEnabled } from "@/lib/features";

interface Payload {
  session: { id: string; level: string; startedAt: number; topic: string | null };
  turns: { id: number; role: "user" | "partner"; text: string; confidence: number | null }[];
  report: StoredReport | null;
}

export default function ReportPageWrapper() {
  return (
    <Suspense>
      <ReportPage />
    </Suspense>
  );
}

function ReportPage() {
  const { t, lang, tag: tagName } = useUI();
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportLang, setReportLang] = useState<"ar" | "en" | "de" | null>(null);
  const autoStarted = useRef(false);

  const load = useCallback(() => api<Payload>(`/api/sessions/${id}`).then(setData, () => setError(t("err_api"))), [id, t]);

  const generate = useCallback(
    async (language?: "ar" | "en" | "de") => {
      setGenerating(true);
      setError(null);
      try {
        await api(`/api/sessions/${id}/report`, { method: "POST", body: JSON.stringify(language ? { language } : {}) });
        await load();
        router.replace(`/reports/${id}`);
      } catch (e) {
        setError(e instanceof ApiError && e.code === "too_short" ? t("report_too_short") : t("err_api"));
      } finally {
        setGenerating(false);
      }
    },
    [id, load, router, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (data && !data.report && search.get("generate") && !autoStarted.current) {
      autoStarted.current = true;
      void generate();
    }
  }, [data, search, generate]);

  if (!data) return <p className="py-20 text-center text-muted">{error ?? t("loading")}</p>;
  const level = (isLevel(data.session.level) ? data.session.level : "A1") as Level;
  const r = data.report;

  if (generating || !r) {
    return (
      <div className={`level-${level.toLowerCase()} max-w-xl mx-auto text-center py-16 space-y-5`}>
        <div className="orb mx-auto !w-28 !h-28" data-state={generating ? "thinking" : "idle"} />
        {generating ? (
          <>
            <h1 className="text-xl font-bold">{t("report_generating")}</h1>
            <p className="text-muted">{t("report_generating_sub")}</p>
          </>
        ) : (
          <>
            <p>{t("report_none")}</p>
            <button className="btn btn-primary" onClick={() => void generate()}>
              <IconSparkle /> {t("report_generate")}
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  const dir = r.language === "ar" ? "rtl" : "ltr";
  const locale = localeOf(lang);
  const del = async () => {
    if (!confirm(t("report_delete_confirm"))) return;
    await api(`/api/sessions/${id}`, { method: "DELETE" }).catch(() => {});
    router.push("/reports");
  };

  return (
    <div className={`level-${level.toLowerCase()} max-w-4xl mx-auto space-y-6`}>
      {/* header */}
      <header className="card p-5 sm:p-6 flex flex-wrap items-center gap-5">
        <Avatar level={level} size={64} />
        <div className="flex-1 min-w-[12rem]">
          <h1 className="text-2xl font-extrabold">{t("report_title")}</h1>
          <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <Info k={t("info_date")} v={new Date(r.session.date).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })} />
            <Info k={t("info_level")} v={r.session.level} />
            <Info k={t("info_duration")} v={`${Math.max(1, Math.round(r.session.durationSec / 60))} ${t("min")}`} />
            <Info k={t("info_turns")} v={String(r.session.userTurns)} />
            <Info k={t("info_words")} v={`≈ ${r.session.userWords}`} />
            {r.session.topic && <Info k={t("info_topic")} v={r.session.topic} />}
          </dl>
        </div>
        <ScoreRing value={r.overall} />
      </header>

      {r.generatedBy === "mock" && <p className="rounded-xl bg-surface-2 px-4 py-2 text-sm text-muted">{t("report_mock_note")}</p>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t("report_lang")}:</span>
        {(["ar", "en", "de"] as const).map((l) => (
          <button
            key={l}
            className="chip min-h-[40px]"
            aria-pressed={(reportLang ?? r.language) === l}
            onClick={() => {
              setReportLang(l);
              if (l !== r.language) void generate(l);
            }}
          >
            {t(`lang_${l}` as TKey)}
          </button>
        ))}
        <button className="chip ms-auto min-h-[40px]" onClick={() => void generate(r.language)}>
          <IconRepeat size={14} /> {t("report_regenerate")}
        </button>
      </div>

      <div dir={dir} className="space-y-6">
        {/* since last time */}
        <Section title={t("report_since")} accent>
          <p>{r.sinceLastTime.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2 mt-3">
            <TagList title={t("report_improved")} tone="ok" items={r.sinceLastTime.improved} tags={r.trackerChanges?.improved} />
            <TagList title={t("report_regressed")} tone="danger" items={r.sinceLastTime.regressed} tags={r.trackerChanges?.regressed} />
            <TagList title={t("report_new")} tone="gold" items={r.sinceLastTime.newIssues} tags={r.trackerChanges?.new} />
            <TagList title={t("report_unresolved")} tone="muted" items={r.sinceLastTime.unresolved} tags={r.trackerChanges?.unresolved} />
          </div>
          <p className="mt-3 text-sm text-muted">
            <b>{t("report_trend5")}:</b> {r.sinceLastTime.lastFiveTrend}
          </p>
        </Section>

        <Section title={t("report_overall")}>
          <p>{r.overallImpression}</p>
        </Section>

        <Section title={t("report_scores")}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {ScoreKeys.map((k) => (
              <li key={k}>
                <div className="flex justify-between text-sm font-medium">
                  <span>{t(`score_${k}` as TKey)}</span>
                  <span className="tabular-nums">
                    {r.scores[k]} · {grade(r.scores[k])}
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-surface-2 overflow-hidden" role="meter" aria-valuenow={r.scores[k]} aria-valuemin={0} aria-valuemax={100} aria-label={t(`score_${k}` as TKey)}>
                  <div className="h-full rounded-full bg-accent" style={{ width: `${r.scores[k]}%` }} />
                </div>
                {r.scoreNotes[k] && <p className="text-xs text-muted mt-1">{r.scoreNotes[k]}</p>}
              </li>
            ))}
          </ul>
        </Section>

        {r.strengths.length > 0 && (
          <Section title={t("report_strengths")}>
            <ul className="space-y-2">
              {r.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-ok">✓</span>
                  <span>
                    {s.point}
                    {s.example && (
                      <q className="block de text-muted text-sm mt-0.5" lang="de">
                        {s.example}
                      </q>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {r.book && <BookReportSection book={r.book} level={r.session.level} />}

        <Section title={`${t("report_mistakes")} (${r.mistakes.length})`}>
          {r.correctionsMode === "rules" && <DemoCorrectionNote />}
          {r.mistakes.length === 0 ? (
            <p className="text-muted">{t("report_no_mistakes")}</p>
          ) : (
            <>
              {/* categories with counts — they also feed the weakness tracker */}
              <p className="flex flex-wrap gap-1.5 mb-4">
                {mistakeGroups(r.mistakes).map(([tag, n]) => (
                  <span key={tag} className="chip !py-0.5 text-sm">
                    {tagName(tag)} <b className="tabular-nums">({n})</b>
                  </span>
                ))}
              </p>
              <ul className="space-y-3">
                {[...r.mistakes]
                  .sort((a, b) => mistakeGroups(r.mistakes).findIndex(([g]) => g === a.tag) - mistakeGroups(r.mistakes).findIndex(([g]) => g === b.tag))
                  .map((m, i) => (
                    <li key={i} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="chip !py-0.5 text-xs">{tagName(m.tag)}</span>
                        <SeverityBadge severity={m.severity} />
                      </div>
                      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1" dir="ltr">
                        <s className="de text-danger decoration-danger/60 decoration-2" lang="de">
                          {m.said}
                        </s>
                        <span className="text-muted">→</span>
                        <b className="de text-ok" lang="de">
                          {m.corrected}
                        </b>
                      </p>
                      <p className="text-sm mt-1.5" dir="auto">
                        {m.explanation}
                      </p>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </Section>

        <Section title={t("report_pron")}>
          <p className="text-xs rounded-lg bg-surface-2 px-3 py-2 mb-3">⚠ {r.pronunciation.disclaimer}</p>
          <ul className="space-y-2">
            {r.pronunciation.notes.map((n, i) => (
              <li key={i} className="text-sm">
                <b className="de" lang="de">
                  {n.word}
                </b>{" "}
                <span className="text-muted">({tagName(n.tag)})</span> — {n.issue} {n.tip && <span className="text-muted">💡 {n.tip}</span>}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("report_vocab")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <WordList title={t("report_vocab_good")} words={r.vocabulary.goodWords} />
            <WordList title={t("report_vocab_struggled")} words={r.vocabulary.struggledWith} />
          </div>
          {r.vocabulary.learnNext.length > 0 && (
            <>
              <h3 className="font-semibold mt-4 mb-2">{t("report_vocab_next")}</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {r.vocabulary.learnNext.map((w, i) => (
                  <li key={i} className="rounded-xl bg-surface-2 p-3 text-sm">
                    <b className="de" lang="de">
                      {w.de}
                    </b>{" "}
                    — {w.meaning}
                    <span className="block de text-muted" lang="de">
                      {w.example}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        <Section title={t("report_homework")} accent>
          <ol className="space-y-3 list-decimal ps-5">
            {r.homework.map((h, i) => (
              <li key={i}>
                <b>{h.title}</b>
                <p className="text-sm">{h.description}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title={t("report_level")}>
          <p className="font-bold">{t(`verdict_${r.levelRecommendation.verdict}` as TKey)}</p>
          <p className="text-sm">{r.levelRecommendation.reasoning}</p>
        </Section>
      </div>

      <TranscriptView turns={data.turns} report={r} />

      <div className="flex flex-wrap gap-3 justify-between">
        <Link href={levelPath(level)} className="btn btn-primary">
          <IconMic /> {t("report_practice_again")}
        </Link>
        <button className="btn btn-ghost text-danger" onClick={del}>
          <IconTrash size={18} /> {t("report_delete")}
        </button>
      </div>
    </div>
  );
}

function grade(n: number) {
  return n >= 85 ? "A" : n >= 70 ? "B" : n >= 55 ? "C" : n >= 40 ? "D" : "E";
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="inline">{k}: </dt>
      <dd className="inline font-semibold text-ink" dir="auto">
        {v}
      </dd>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const c = 2 * Math.PI * 34;
  return (
    <div className="relative w-24 h-24" role="img" aria-label={`${value} / 100`}>
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-2xl font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <section className={`card p-5 sm:p-6 ${accent ? "border-s-4 border-s-[var(--accent)]" : ""}`}>
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function TagList({ title, items, tags, tone }: { title: string; items: string[]; tags?: string[]; tone: "ok" | "danger" | "gold" | "muted" }) {
  const { tag: tagName } = useUI();
  const all = items.length ? items : (tags ?? []).map((x) => tagName(x));
  if (all.length === 0) return null;
  const color = { ok: "text-ok", danger: "text-danger", gold: "text-gold", muted: "text-muted" }[tone];
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <h3 className={`text-sm font-bold ${color}`}>{title}</h3>
      <ul className="text-sm mt-1 space-y-0.5">
        {all.map((x, i) => (
          <li key={i}>• {x}</li>
        ))}
      </ul>
    </div>
  );
}

function WordList({ title, words }: { title: string; words: string[] }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {words.length ? (
        <div className="flex flex-wrap gap-1.5">
          {words.map((w) => (
            <span key={w} className="chip de !py-0.5 text-sm" lang="de">
              {w}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-muted text-sm">—</p>
      )}
    </div>
  );
}

function mistakeGroups(mistakes: StoredReport["mistakes"]): [string, number][] {
  const counts = new Map<string, number>();
  for (const m of mistakes) counts.set(m.tag, (counts.get(m.tag) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const { t } = useUI();
  const cls = severity === "high" ? "bg-danger/15 text-danger" : severity === "medium" ? "bg-gold/15 text-gold" : "bg-surface-2 text-muted";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{t(`report_severity_${severity}` as TKey)}</span>;
}

function DemoCorrectionNote() {
  const { t } = useUI();
  if (!aiChatEnabled()) return null; // no "demo" notices while the AI chat is switched off
  return <p className="mb-3 rounded-lg bg-gold/10 px-3 py-2 text-xs">⚠ {t("report_demo_corrections")}</p>;
}

/** Wrap every occurrence of `parts` in `text` with a highlight (case-insensitive). */
function Highlight({ text, parts, className }: { text: string; parts: string[]; className: string }) {
  const clean = parts.map((p) => p.trim()).filter(Boolean);
  if (!clean.length) return <>{text}</>;
  const esc = clean.sort((a, b) => b.length - a.length).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pieces = text.split(new RegExp(`(${esc.join("|")})`, "gi"));
  return (
    <>
      {pieces.map((piece, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={className}>
            {piece}
          </mark>
        ) : (
          piece
        ),
      )}
    </>
  );
}

function CorrectionsList({ report }: { report: StoredReport }) {
  const { t, tag: tagName } = useUI();
  const list = report.corrections;
  // Reports created before sentence-by-sentence corrections only have the corrected pairs.
  if (!list) {
    return report.correctedSentences.length ? (
      <ul className="space-y-3" dir="ltr">
        {report.correctedSentences.map((c, i) => (
          <li key={i} className="de text-sm" lang="de">
            <s className="text-danger">{c.original}</s>
            <br />
            <b className="text-ok">→ {c.corrected}</b>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-muted">—</p>
    );
  }
  if (!list.length) return <p className="text-muted">—</p>;
  return (
    <>
      {report.correctionsMode === "rules" && <DemoCorrectionNote />}
      <ol className="space-y-3">
        {list.map((c) => (
          <li key={c.turn} className={`rounded-2xl border p-4 ${c.isCorrect ? "border-ok/40 bg-ok/5" : "border-line"}`}>
            {c.isCorrect ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ok">{t("report_sentence_ok")} ✓</p>
                <p className="de text-[1.05rem]" lang="de" dir="ltr">
                  {c.original}
                </p>
                {c.natural && c.natural !== c.original && (
                  <p className="text-sm text-muted">
                    {t("report_more_natural")}:{" "}
                    <span className="de text-ink" lang="de">
                      {c.natural}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-danger/5 p-3">
                    <p className="text-xs font-semibold text-danger mb-1">{t("report_said")}</p>
                    <p className="de text-[1.05rem] leading-relaxed" lang="de" dir="ltr">
                      <Highlight text={c.original} parts={c.fixes.map((f) => f.wrong)} className="bg-transparent text-danger line-through decoration-2 decoration-danger/70" />
                    </p>
                  </div>
                  <div className="rounded-xl bg-ok/5 p-3">
                    <p className="text-xs font-semibold text-ok mb-1">{t("report_correct")}</p>
                    <p className="de text-[1.05rem] leading-relaxed" lang="de" dir="ltr">
                      <Highlight text={c.corrected} parts={c.fixes.map((f) => f.right)} className="bg-ok/15 text-ok font-semibold rounded px-0.5" />
                    </p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {c.fixes.map((f, i) => (
                    <li key={i} className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="chip !py-0 text-xs">{tagName(f.tag)}</span>
                      <SeverityBadge severity={f.severity} />
                      <span dir="auto">{f.explanation}</span>
                    </li>
                  ))}
                </ul>
                {c.natural && c.natural !== c.corrected && (
                  <p className="text-sm text-muted mt-2">
                    {t("report_more_natural")}:{" "}
                    <span className="de text-ink" lang="de">
                      {c.natural}
                    </span>
                  </p>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

function TranscriptView({ turns, report }: { turns: Payload["turns"]; report: StoredReport }) {
  const { t } = useUI();
  const [view, setView] = useState<"transcript" | "corrected">("corrected");
  const wrongParts = report.corrections ? report.corrections.flatMap((c) => c.fixes.map((f) => f.wrong)) : report.mistakes.map((m) => m.said);
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex gap-2 mb-4" role="tablist">
        <button role="tab" className="chip" aria-selected={view === "corrected"} onClick={() => setView("corrected")}>
          {t("report_view_corrected")}
        </button>
        <button role="tab" className="chip" aria-selected={view === "transcript"} onClick={() => setView("transcript")}>
          {t("report_view_transcript")}
        </button>
      </div>
      {view === "transcript" ? (
        <ol className="space-y-2" dir="ltr">
          {turns.map((x) => (
            <li key={x.id} className={`de text-sm ${x.role === "user" ? "font-medium" : "text-muted"}`} lang="de">
              <span className="text-xs uppercase tracking-wide me-2 opacity-70">{x.role === "user" ? t("conv_you") : "Partner"}</span>
              {x.role === "user" ? <Highlight text={x.text} parts={wrongParts} className="bg-danger/15 text-inherit rounded px-0.5" /> : x.text}
            </li>
          ))}
        </ol>
      ) : (
        <CorrectionsList report={report} />
      )}
    </section>
  );
}
