"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, useProviders } from "@/lib/client/api";
import { fill, localeOf } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import type { BookTopic } from "@/lib/book";
import type { Level } from "@/lib/levels";
import type { WritingCheck } from "@/lib/writing";
import type { JournalEntry } from "@/lib/journal";
import { IconArrow } from "../Icons";
import { TopicPicker } from "./ReadPanel";
import { useSite } from "../site/SiteProvider";
import { TopicTitle, useBookTopic, useLevelTopics } from "./shared";

// ✍️ Schreiben: after studying a topic, write about it in your own words — what you learned, the
// words and sentences, the video, the talk with Gemini, the grammar. No questions, no translation.

const JOURNAL_PART = 3;
const draftKey = (topic: number) => `gs_journal_draft_${topic}`;
/** Words in the text (same rule as the server). */
const countWords = (text: string) => (text.match(/[\p{L}][\p{L}\p{M}'’-]*/gu) ?? []).length;

export function WritePanel({ level }: { level: Level }) {
  const { t } = useUI();
  const { topics } = useLevelTopics(level);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<number | null>(null);
  const reload = useCallback(() => {
    api<{ scores: Record<string, number> }>(`/api/skills/scores?skill=write&level=${level}`).then((d) => setScores(d.scores), () => {});
  }, [level]);
  useEffect(reload, [reload]);

  if (open) return <TopicJournal n={open} onBack={() => setOpen(null)} onSaved={reload} />;
  return (
    <TopicPicker
      topics={topics}
      title={t("write_pick")}
      badge={(tp) => {
        const s = scores[`${tp.number}:${JOURNAL_PART}`];
        return s == null ? null : s >= 100 ? "✓" : `${s}%`;
      }}
      onPick={setOpen}
    />
  );
}

function TopicJournal({ n, onBack, onSaved }: { n: number; onBack: () => void; onSaved: () => void }) {
  const { t, lang } = useUI();
  const { offerPause } = useSite();
  const providers = useProviders();
  const data = useBookTopic(n);
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [goal, setGoal] = useState(40);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      setText(localStorage.getItem(draftKey(n)) ?? "");
    } catch {
      /* storage blocked: start empty */
    }
    api<{ entries: JournalEntry[]; goal: number }>(`/api/book/journal?topic=${n}`).then(
      (r) => (setEntries(r.entries), setGoal(r.goal)),
      () => {},
    );
  }, [n]);

  const change = (v: string) => {
    setText(v);
    setSaved(false);
    try {
      if (v.trim()) localStorage.setItem(draftKey(n), v);
      else localStorage.removeItem(draftKey(n));
    } catch {
      /* the draft just isn't kept */
    }
  };

  const save = async () => {
    setBusy(true);
    setError(false);
    try {
      const r = await api<{ entry: JournalEntry; score: number }>("/api/book/journal", { method: "POST", body: JSON.stringify({ topic: n, text }) });
      setEntries((xs) => [r.entry, ...xs]);
      setSaved(true);
      try {
        localStorage.removeItem(draftKey(n));
      } catch {
        /* nothing to clean */
      }
      onSaved();
      if (r.score >= 100) offerPause();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-muted">{t("loading")}</p>;
  const topic = data.topic;
  const words = countWords(text);
  const reached = words >= goal;
  const last = entries[0];

  return (
    <div className="space-y-5">
      <button className="chip min-h-[40px]" onClick={onBack}>
        <IconArrow size={16} className="rotate-180 rtl:rotate-0" /> {t("read_back_topics")}
      </button>
      <header>
        <TopicTitle tp={topic} size="lg" />
      </header>

      <section className="card depth p-4 sm:p-6 space-y-4" aria-labelledby="journal-title">
        <div>
          <h2 id="journal-title" className="text-xl sm:text-2xl font-extrabold">
            {t("journal_title")}
          </h2>
          <p className="text-muted mt-1 leading-relaxed">{t("journal_sub")}</p>
        </div>

        {saved && last ? (
          <div className="rounded-2xl border border-ok/40 bg-ok/10 p-4 space-y-2" role="status">
            <p className="font-bold text-ok">{last.words >= goal ? t("journal_goal_done") : t("journal_saved")}</p>
            <p dir="ltr" lang="de" className="de whitespace-pre-wrap leading-relaxed">
              {last.text}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className="btn btn-ghost !min-h-[40px]" onClick={() => setSaved(false)}>
                {t("journal_write_more")}
              </button>
            </div>
            {providers?.llm === "anthropic" && <OptionalCheck topic={topic} text={last.text} />}
          </div>
        ) : (
          <>
            <textarea
              className="field min-h-[220px] sm:min-h-[260px] de text-[17px] leading-relaxed"
              dir="ltr"
              lang="de"
              value={text}
              onChange={(e) => change(e.target.value)}
              placeholder={t("journal_ph")}
              maxLength={5000}
              autoCapitalize="sentences"
              aria-labelledby="journal-title"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-[10rem] flex-1 max-w-xs">
                <div className="flex justify-between text-sm">
                  <span className={reached ? "text-ok font-bold" : "text-muted"}>{fill(t("journal_words"), { n: words })}</span>
                  <span className="text-muted">{fill(t("journal_goal"), { n: goal })}</span>
                </div>
                <div className="h-1.5 mt-1 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-[var(--level-c,var(--brand))] transition-[width]" style={{ width: `${Math.min(100, (100 * words) / goal)}%` }} />
                </div>
              </div>
              <button type="button" className="btn btn-primary !min-h-[44px]" onClick={() => void save()} disabled={busy || !text.trim()}>
                {busy ? t("loading") : t("journal_save")}
              </button>
            </div>
            <p className="text-xs text-muted">{t("journal_draft")}</p>
            {error && <p className="text-danger text-sm">{t("journal_failed")}</p>}
          </>
        )}
      </section>

      {entries.length > (saved ? 1 : 0) && (
        <section className="space-y-3" aria-labelledby="journal-history">
          <h3 id="journal-history" className="font-bold">
            {t("journal_history")}
          </h3>
          <ul className="space-y-3">
            {entries.slice(saved ? 1 : 0).map((e) => (
              <li key={e.id} className="card p-4">
                <p className="text-xs text-muted mb-2">
                  {new Date(e.createdAt).toLocaleDateString(localeOf(lang), { day: "numeric", month: "short", year: "numeric" })} · {fill(t("journal_words"), { n: e.words })}
                </p>
                <p dir="ltr" lang="de" className="de whitespace-pre-wrap leading-relaxed">
                  {e.text}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Only when an AI is set up: corrections of what was written, on request. */
function OptionalCheck({ topic, text }: { topic: BookTopic; text: string }) {
  const { t } = useUI();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WritingCheck | null>(null);
  const [error, setError] = useState(false);
  const run = async () => {
    setBusy(true);
    setError(false);
    try {
      setResult(await api<WritingCheck>("/api/book/writing", { method: "POST", body: JSON.stringify({ topic: topic.number, text: text.slice(0, 3000) }) }));
    } catch (e) {
      setError(!(e instanceof ApiError && e.code === "need_api"));
    } finally {
      setBusy(false);
    }
  };
  const fixes = result?.corrections.filter((c) => !c.isCorrect) ?? [];
  if (!result)
    return (
      <div className="pt-1">
        <button type="button" className="btn btn-ghost !min-h-[40px]" onClick={() => void run()} disabled={busy}>
          {busy ? t("loading") : t("journal_check")}
        </button>
        {error && <p className="text-danger text-sm mt-1">{t("write_free_failed")}</p>}
      </div>
    );
  return (
    <div className="space-y-3 pt-2" role="status">
      <h4 className="font-bold">{t("write_free_result")}</h4>
      {fixes.length === 0 && <p className="text-ok font-semibold">{t("write_free_none")}</p>}
      {fixes.map((c) => (
        <div key={c.turn} className="rounded-2xl border border-line bg-surface p-3 space-y-1.5">
          <p className="text-sm">
            <span className="text-muted">{t("write_free_original")}: </span>
            <span dir="ltr" lang="de" className="de text-danger">
              {c.original}
            </span>
          </p>
          <p>
            <span className="text-sm text-muted">{t("write_free_corrected")}: </span>
            <span dir="ltr" lang="de" className="de font-bold text-ok">
              {c.corrected}
            </span>
          </p>
          <ul className="text-sm space-y-1">
            {c.fixes.map((f, k) => (
              <li key={k}>
                <span dir="ltr" className="de">
                  {f.wrong} → <b>{f.right}</b>
                </span>{" "}
                — <span lang="ar" dir="rtl">{f.explanation}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {fixes.length > 0 && <p className="text-xs text-muted">{t("write_free_saved")}</p>}
    </div>
  );
}
