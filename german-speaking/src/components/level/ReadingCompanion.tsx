"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { books } from "../../../data/books";
import { GEMINI_URL } from "../../../data/gemini-prompts";
import { api } from "@/lib/client/api";
import { copyAndOpen } from "@/lib/client/clipboard";
import { fill, localeOf, type TKey } from "@/lib/client/i18n";
import { useUI } from "@/lib/client/ui";
import { germanVoices, unlockSpeech } from "@/lib/client/tts";
import type { Level } from "@/lib/levels";

type Note = { id: string; word: string; meaning: string; sentence: string; page: number | null; createdAt: number };
type ReadingState = {
  book: { currentPage: number; totalPages: number | null };
  steps: boolean[];
  hasReadToday: boolean;
  streak: number;
  week: boolean[];
};
type Draft = { id?: string; word: string; meaning: string; sentence: string; page: string };

function localDay() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function sayGerman(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
  unlockSpeech();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.voice = germanVoices().find((voice) => voice.lang.toLowerCase().startsWith("de")) ?? null;
  window.speechSynthesis.speak(utterance);
}

function downloadNotes(notes: Note[], level: Level) {
  const cell = (value: string | number | null) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
  const rows = [["German word", "Arabic meaning", "My sentence", "Page"], ...notes.map((note) => [note.word, note.meaning, note.sentence, note.page])];
  const csv = "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "meine-woerter-" + level.toLowerCase() + ".csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ReadingCompanion({ level }: { level: Level }) {
  const { t, lang } = useUI();
  const book = books[level];
  const day = localDay();
  const endpoint = "/api/reading/" + level;
  const [state, setState] = useState<ReadingState | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentPage, setCurrentPage] = useState("0");
  const [totalPages, setTotalPages] = useState("");
  const [draft, setDraft] = useState<Draft>({ word: "", meaning: "", sentence: "", page: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [geminiCopied, setGeminiCopied] = useState(false);

  const reload = useCallback(async () => {
    const [reading, notebook] = await Promise.all([
      api<{ state: ReadingState }>(endpoint + "?day=" + day),
      api<{ notes: Note[] }>(endpoint + "/notes"),
    ]);
    setState(reading.state);
    setCurrentPage(String(reading.state.book.currentPage));
    setTotalPages(reading.state.book.totalPages === null ? "" : String(reading.state.book.totalPages));
    setNotes(notebook.notes);
  }, [day, endpoint]);

  useEffect(() => { void reload().catch(() => setNotice(t("lr_error"))); }, [reload, t]);

  const levelColor = { A1: "#38bdf8", A2: "#34d399", B1: "#f59e0b", B2: "#a78bfa" }[level];
  const finishDate = useMemo(() => {
    if (!state?.book.totalPages) return null;
    const remaining = Math.max(0, state.book.totalPages - state.book.currentPage);
    const date = new Date(day + "T12:00:00");
    date.setDate(date.getDate() + remaining);
    return date.toLocaleDateString(localeOf(lang), { dateStyle: "long" });
  }, [day, lang, state]);

  const saveBook = async (event: FormEvent) => {
    event.preventDefault();
    const page = Number(currentPage);
    const total = totalPages.trim() ? Number(totalPages) : null;
    if (!Number.isInteger(page) || page < 0 || (total !== null && (!Number.isInteger(total) || total < 1 || page > total))) {
      setNotice(t("lr_error"));
      return;
    }
    setBusy(true);
    try {
      const response = await api<{ state: ReadingState }>(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ action: "book", day, currentPage: page, totalPages: total }),
      });
      setState(response.state);
      setCurrentPage(String(response.state.book.currentPage));
      setTotalPages(response.state.book.totalPages === null ? "" : String(response.state.book.totalPages));
      setNotice(t("lr_saved"));
      window.dispatchEvent(new Event("gs:reading-progress"));
    } catch { setNotice(t("lr_error")); }
    finally { setBusy(false); }
  };

  const toggleStep = async (index: number) => {
    if (!state) return;
    const steps = state.steps.map((checked, i) => i === index ? !checked : checked);
    setState({ ...state, steps });
    try {
      await api(endpoint, { method: "PATCH", body: JSON.stringify({ action: "steps", day, steps }) });
    } catch {
      setState({ ...state, steps: state.steps });
      setNotice(t("lr_error"));
    }
  };

  const markPage = async () => {
    setBusy(true);
    try {
      const response = await api<{ state: ReadingState; alreadyDone: boolean }>(endpoint, {
        method: "PATCH", body: JSON.stringify({ action: "complete", day }),
      });
      setState(response.state);
      setCurrentPage(String(response.state.book.currentPage));
      setNotice(response.alreadyDone ? t("lr_today_done") : t("lr_saved"));
      window.dispatchEvent(new Event("gs:reading-progress"));
    } catch { setNotice(t("lr_error")); }
    finally { setBusy(false); }
  };

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      word: draft.word,
      meaning: draft.meaning,
      sentence: draft.sentence,
      page: draft.page.trim() ? Number(draft.page) : null,
    };
    if (!payload.word.trim() || (payload.page !== null && (!Number.isInteger(payload.page) || payload.page < 1))) return;
    setBusy(true);
    try {
      if (draft.id) {
        await api(endpoint + "/notes/" + draft.id, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api(endpoint + "/notes", { method: "POST", body: JSON.stringify(payload) });
      }
      setDraft({ word: "", meaning: "", sentence: "", page: "" });
      setNotes((await api<{ notes: Note[] }>(endpoint + "/notes")).notes);
      setNotice(t("lr_saved"));
    } catch { setNotice(t("lr_error")); }
    finally { setBusy(false); }
  };

  const editNote = (note: Note) => setDraft({
    id: note.id, word: note.word, meaning: note.meaning, sentence: note.sentence,
    page: note.page === null ? "" : String(note.page),
  });

  const removeNote = async (id: string) => {
    try {
      await api(endpoint + "/notes/" + id, { method: "DELETE" });
      setNotes(notes.filter((note) => note.id !== id));
      if (draft.id === id) setDraft({ word: "", meaning: "", sentence: "", page: "" });
    } catch { setNotice(t("lr_error")); }
  };

  const talkAboutPage = async () => {
    const recentWords = notes.slice(0, 5).map((note) => note.word).join(", ");
    const prompt = "Ich lese das Buch '" + book.title + "' auf Niveau " + level + ". Heute habe ich Seite " +
      (state?.book.currentPage ?? currentPage) + " gelesen. Frag mich, was passiert ist, und hilf mir mit meinen neuen Wörtern: " +
      (recentWords || "Ich habe noch keine Wörter notiert.") + ". Bitte zitiere keinen Buchtext.";
    const ok = await copyAndOpen(prompt, GEMINI_URL);
    setGeminiCopied(ok);
    window.setTimeout(() => setGeminiCopied(false), 2500);
  };

  const method = [
    { title: "lr_step1_title", ar: "اقرا الصفحة كلها مرة واحدة قراءة عامة، من غير ما تقف عند الكلمات اللي مش فاهمها. افهم الفكرة بس.", de: "Lies die ganze Seite einmal. Bleib nicht an unbekannten Wörtern hängen. Versteh die Idee." },
    { title: "lr_step2_title", ar: "اقرا تاني وعلّم على الكلمات اللي مش عارفها.", de: "Lies noch einmal und markiere die Wörter, die du nicht kennst." },
    { title: "lr_step3_title", ar: "اقرا للمرة التالتة، وحاول تحط كل كلمة جديدة في جملة من عندك، واكتبها في النوتس.", de: "Lies ein drittes Mal. Bilde mit jedem neuen Wort einen eigenen Satz und schreib ihn in deine Notizen." },
  ] as const;
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(day + "T12:00:00");
    date.setDate(date.getDate() - 6 + i);
    return date.toLocaleDateString(localeOf(lang), { weekday: "short" });
  });

  return (
    <section className="space-y-4" aria-label={t("lr_title")}>
      <header className="space-y-1">
        <h2 className="text-xl font-extrabold">{t("lr_title")}</h2>
        <p className="text-sm text-muted">{t("lr_subtitle")}</p>
      </header>

      <div className="reading-daily card p-4 sm:p-5 space-y-1" style={{ borderColor: levelColor }}>
        <p className="font-extrabold">{t("lr_daily_ar")}</p>
        <p className="de font-semibold" lang="de" dir="ltr">{t("lr_daily_de")}</p>
        {lang === "en" && <p className="text-sm">{t("lr_daily_en")}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(170px,230px)_1fr] items-center card depth p-4 sm:p-6">
        <div className="reading-book-scene mx-auto" aria-label={book.title}>
          <div className="reading-book-spine" style={{ backgroundColor: levelColor }} />
          <div className="reading-book-cover" style={{ background: "linear-gradient(145deg, " + levelColor + ", color-mix(in srgb, " + levelColor + " 34%, #111827))" }}>
            <span className="text-xs font-black uppercase tracking-[.18em]">Hueber · Lesen</span>
            <span className="reading-book-mark" aria-hidden="true">📖</span>
            <span className="text-sm font-bold leading-snug">{book.title}</span>
            <span className="text-xs opacity-90">{book.author}</span>
            <span className="reading-level-mark">{level}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{book.publisher} · Niveau {level}</p>
            <h3 className="text-lg sm:text-xl font-extrabold leading-snug" lang="de" dir="ltr">{book.title}</h3>
            <p className="text-sm text-muted">{book.author} · {book.series}</p>
          </div>
          <p className="text-sm leading-relaxed">{book.description[lang]}</p>
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-primary" style={{ background: levelColor }} href={book.buyUrl} target="_blank" rel="noopener noreferrer">{t("lr_buy")}</a>
            <a className="btn btn-ghost" href={book.borrowUrl} target="_blank" rel="noopener noreferrer">{t("lr_borrow")}</a>
          </div>
          <p className="text-xs text-muted">{t("lr_copyright")}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold">{t("lr_method_title")}</h3>
        <ol className="grid gap-3 md:grid-cols-3">
          {method.map((step, index) => (
            <li key={step.title} className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center w-8 h-8 rounded-full text-white font-bold" style={{ background: levelColor }}>{index + 1}</span>
                <h4 className="font-bold">{t(step.title as TKey)}</h4>
              </div>
              <p className="text-sm leading-relaxed" lang="ar" dir="rtl">{step.ar}</p>
              <p className="text-sm leading-relaxed de" lang="de" dir="ltr">{step.de}</p>
              <label className="flex items-start gap-2 text-sm font-semibold cursor-pointer">
                <input type="checkbox" checked={state?.steps[index] ?? false} onChange={() => void toggleStep(index)} disabled={!state} className="mt-1 size-4 accent-[var(--accent)]" />
                <span>{t("lr_step_done")}</span>
              </label>
            </li>
          ))}
        </ol>
      </div>

      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">{t("lr_notes_title")}</h3>
          <button type="button" className="btn btn-ghost !min-h-[40px]" onClick={() => downloadNotes(notes, level)} disabled={!notes.length}>{t("lr_export")}</button>
        </div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void saveNote(event)}>
          <label className="space-y-1 text-sm font-semibold">
            <span>{t("lr_word")} *</span>
            <input className="field w-full" dir="ltr" lang="de" required maxLength={160} value={draft.word} onChange={(event) => setDraft({ ...draft, word: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            <span>{t("lr_meaning")}</span>
            <input className="field w-full" dir="auto" maxLength={300} value={draft.meaning} onChange={(event) => setDraft({ ...draft, meaning: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold sm:col-span-2">
            <span>{t("lr_sentence")}</span>
            <textarea className="field w-full min-h-20" dir="ltr" lang="de" maxLength={600} value={draft.sentence} onChange={(event) => setDraft({ ...draft, sentence: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            <span>{t("lr_page")}</span>
            <input className="field w-full" type="number" min="1" max="5000" value={draft.page} onChange={(event) => setDraft({ ...draft, page: event.target.value })} />
          </label>
          <div className="flex items-end gap-2">
            <button className="btn btn-primary" type="submit" disabled={busy}>{draft.id ? t("lr_save_edit") : t("lr_add_word")}</button>
            {draft.id && <button className="btn btn-ghost" type="button" onClick={() => setDraft({ word: "", meaning: "", sentence: "", page: "" })}>{t("back")}</button>}
          </div>
        </form>
        {notes.length ? (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-2xl border border-line bg-surface-2/60 p-3 flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-bold de text-start" dir="ltr" lang="de">{note.word} {note.page ? <span className="text-xs text-muted">· {t("lr_page")} {note.page}</span> : null}</p>
                  {note.meaning && <p className="text-sm" dir="auto">{note.meaning}</p>}
                  {note.sentence && <p className="text-sm de" dir="ltr" lang="de">{note.sentence}</p>}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button className="chip !min-h-[38px]" type="button" onClick={() => sayGerman(note.word)} aria-label={t("lr_play_word")}>🔊 {t("lr_play_word")}</button>
                  {note.sentence && <button className="chip !min-h-[38px]" type="button" onClick={() => sayGerman(note.sentence)} aria-label={t("lr_play_sentence")}>🔊 {t("lr_play_sentence")}</button>}
                  <button className="chip !min-h-[38px]" type="button" onClick={() => editNote(note)}>{t("lr_edit")}</button>
                  <button className="chip !min-h-[38px] text-danger" type="button" onClick={() => void removeNote(note.id)}>{t("lr_delete")}</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">{t("lr_empty")}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="text-sm font-semibold text-accent underline underline-offset-4 min-h-[40px]" onClick={() => void talkAboutPage()}>
            ✨ {geminiCopied ? t("lr_copied") : t("lr_gemini")}
          </button>
          <p className="text-xs text-muted">{t("lr_gemini_hint")}</p>
        </div>
      </div>

      <div className="card p-4 sm:p-5 space-y-4">
        <h3 className="text-lg font-bold">{t("lr_tracker_title")}</h3>
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end" onSubmit={(event) => void saveBook(event)}>
          <label className="space-y-1 text-sm font-semibold">
            <span>{t("lr_current_page")}</span>
            <input className="field w-full" type="number" min="0" max="5000" value={currentPage} onChange={(event) => setCurrentPage(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            <span>{t("lr_page_count")}</span>
            <input className="field w-full" type="number" min="1" max="5000" placeholder={t("lr_page_count_ph")} value={totalPages} onChange={(event) => setTotalPages(event.target.value)} />
          </label>
          <button type="submit" className="btn btn-ghost" disabled={busy}>{t("lr_save")}</button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold tabular-nums">
            {state?.book.totalPages ? fill(t("lr_progress"), { current: state.book.currentPage, total: state.book.totalPages }) : t("lr_count_saved")}
          </p>
          <p className="text-sm font-bold">🔥 {fill(t("lr_streak"), { count: state?.streak ?? 0 })}</p>
        </div>
        {state?.book.totalPages && (
          <div className="space-y-2">
            <div className="h-3 rounded-full bg-surface-2 overflow-hidden" role="meter" aria-valuenow={Math.min(100, Math.round(100 * state.book.currentPage / state.book.totalPages))} aria-valuemin={0} aria-valuemax={100} aria-label={t("lr_tracker_title")}>
              <div className="h-full rounded-full transition-[width]" style={{ width: Math.min(100, 100 * state.book.currentPage / state.book.totalPages) + "%", background: levelColor }} />
            </div>
            <p className="text-xs text-muted">{finishDate ? fill(t("lr_finish_date"), { date: finishDate }) : ""}</p>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t("lr_week")}</p>
          <div className="flex flex-wrap gap-3">
            {weekdays.map((weekday, index) => (
              <span key={weekday + index} className="flex items-center gap-1.5 text-xs">
                <i className={"reading-week-dot" + (state?.week[index] ? " is-read" : "")} aria-label={state?.week[index] ? t("lr_today_done") : ""} />
                {weekday}
              </span>
            ))}
          </div>
        </div>
        {state && !state.hasReadToday && <p className="text-sm text-accent font-semibold">{t("lr_reminder")}</p>}
        {state?.hasReadToday ? (
          <p className="rounded-xl bg-ok/10 text-ok font-bold p-3">{t("lr_today_done")}</p>
        ) : (
          <button type="button" className="btn btn-primary w-full sm:w-auto" style={{ background: levelColor }} onClick={() => void markPage()} disabled={busy || !state || !state.book.totalPages || state.book.currentPage >= state.book.totalPages}>
            {t("lr_mark_done")}
          </button>
        )}
        {notice && <p role="status" className="text-sm text-muted">{notice}</p>}
      </div>
    </section>
  );
}
