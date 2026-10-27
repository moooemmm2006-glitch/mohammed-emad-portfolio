// Server-side orchestration of one partner turn, tuned for latency: the reply is streamed and
// checked sentence by sentence, the first sentence goes out as soon as it passes, and database
// writes and context summaries happen after the reply has been sent.

import { z } from "zod";
import { serverConfig } from "./config";
import { addTurn, getSession, getSettings, getTurns, getWeaknesses, logViolation, updateSession, type TurnRow } from "./db/repo";
import { detectIntent, hasArabic } from "./intent";
import { checkAfterTheFact, CheckSchema, streamLevelLocked, type LockStatus, type Violation } from "./levelLock";
import { heuristicCheck, stripArabicHints } from "./levelLock/heuristics";
import { isLevel, LEVEL_CONFIG, type Level } from "./levels";
import { getLLM, type ChatMessage, type LLM } from "./llm";
import {
  buildPartnerSystemPrompt,
  checkerSystemPrompt,
  checkerUserPrompt,
  fixSentenceSystemPrompt,
  fixSentenceUserPrompt,
  hintSystemPrompt,
  regenerationFeedback,
  START_SIGNAL,
  summarySystemPrompt,
  turnInstruction,
} from "./prompts";
import { splitSentences } from "./text";
import { getTopicByNumber, type BookTopic } from "./book";
import { CLOSING, greeting as scriptGreeting, judgeAnswer, nextItem, reaction, scriptFor } from "./bookScript";
import { parseMeta, type SessionRow } from "./db/repo";

export type TurnEvent =
  | { type: "status"; value: LockStatus | "listening" }
  | { type: "sentence"; text: string }
  | { type: "done"; text: string; fallback: string; ms: number }
  | { type: "error"; code: string; message: string };

// Keep the last N turns verbatim; older ones are folded into a running summary.
const KEEP_RECENT = 10;
const SUMMARISE_AFTER = 16;

export function toMessages(turns: Pick<TurnRow, "role" | "text">[], startedFresh: boolean): ChatMessage[] {
  const msgs: ChatMessage[] = startedFresh ? [{ role: "user", content: START_SIGNAL }] : [];
  for (const t of turns) {
    const role = t.role === "user" ? "user" : "assistant";
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content += `\n${t.text}`;
    else msgs.push({ role, content: t.text });
  }
  if (msgs.length === 0 || msgs[0].role !== "user") msgs.unshift({ role: "user", content: "[Fortsetzung des Gesprächs]" });
  return msgs;
}

/** Fold older turns into the session summary. Runs after the reply was sent, so it never adds latency. */
async function summariseIfNeeded(llm: LLM, sessionId: string, turns: Pick<TurnRow, "role" | "text">[], summary: string | null, upto: number) {
  if (turns.length - upto <= SUMMARISE_AFTER) return;
  const cut = turns.length - KEEP_RECENT;
  const text = turns
    .slice(upto, cut)
    .map((t) => `${t.role === "user" ? "Learner" : "Partner"}: ${t.text}`)
    .join("\n");
  try {
    const newSummary = await llm.chat({
      model: serverConfig().checkModel,
      system: summarySystemPrompt(),
      messages: [{ role: "user", content: `${summary ? `Previous summary: ${summary}\n\n` : ""}Conversation:\n${text}` }],
      maxTokens: 300,
      purpose: "summary",
    });
    await updateSession(sessionId, { summary: newSummary, summaryUpto: cut });
  } catch {
    // not critical: the next turn simply sends a bit more context
  }
}

export interface TurnInput {
  sessionId: string;
  userText?: string;
  confidence?: number | null;
  alternatives?: string[];
  input?: "voice" | "text";
  emit: (e: TurnEvent) => void;
  signal?: AbortSignal;
  llm?: LLM;
}

export async function runPartnerTurn(inp: TurnInput): Promise<void> {
  const started = Date.now();
  const { emit } = inp;
  const session = await getSession(inp.sessionId);
  if (!session || !isLevel(session.level)) {
    emit({ type: "error", code: "not_found", message: "Session not found" });
    return;
  }
  // Memory (settings, weaknesses) always comes from the session owner's own history.
  const [settings, weaknesses] = await Promise.all([getSettings(session.userId), getWeaknesses(session.userId).catch(() => [])]);
  const level: Level = session.level;
  const cfg = serverConfig();
  const llm = inp.llm ?? getLLM();
  const background: Promise<unknown>[] = [];
  if (session.status !== "active") background.push(updateSession(session.id, { status: "active", endedAt: null }));

  const prior = await getTurns(session.id);
  const userText = inp.userText?.trim();
  const bookTopic = session.bookTopic ? await getTopicByNumber(session.bookTopic) : null;
  // Guided book conversation without an API key: the book's own questions and answers.
  if (bookTopic && llm.provider === "mock") {
    await runScriptedTurn({ session, topic: bookTopic, prior, userText, inp, started, background });
    return;
  }
  // Save the learner's turn in the background; the reply doesn't need to wait for it.
  const userSaved = userText
    ? addTurn(session.id, "user", userText, {
        confidence: inp.confidence ?? null,
        meta: { input: inp.input ?? "voice", alternatives: inp.alternatives?.slice(0, 4) },
      })
    : Promise.resolve(null);
  const turns: Pick<TurnRow, "role" | "text">[] = userText ? [...prior, { role: "user", text: userText }] : prior;
  const isGreeting = prior.length === 0 && !userText;

  const { intent, topic } = userText ? detectIntent(userText) : { intent: "chat" as const, topic: null };
  const learnerUsedArabic = userText ? hasArabic(userText) || /\b(what|how|why|please|explain)\b/i.test(userText) : false;
  // A1/A2 may add a short Arabic explanation when explaining, or when the learner asked in Arabic/English.
  const allowArabic = (level === "A1" || level === "A2") && (intent === "explain" || learnerUsedArabic);
  const openWeaknesses = weaknesses
    .filter((w) => w.status === "new" || w.status === "persisting")
    .slice(0, 5)
    .map((w) => w.tag);
  const messages = toMessages(turns.slice(session.summaryUpto), session.summaryUpto === 0);
  const system =
    buildPartnerSystemPrompt({
      level,
      topic: session.topic,
      correctionMode: settings.correctionMode,
      focus: settings.focusSteering && session.focusTag ? { tag: session.focusTag } : null,
      summary: session.summary,
      weaknesses: openWeaknesses,
      bookTopic,
    }) +
    (session.pendingFeedback ?? "") +
    turnInstruction(level, intent, topic, learnerUsedArabic);

  const limits = LEVEL_CONFIG[level].limits;
  const maxTokens = intent === "chat" ? limits.maxTokens : limits.maxTokensLong;
  const previous = prior.filter((t) => t.role === "partner").flatMap((t) => splitSentences(t.text));

  const recordViolations = (index: number, vs: Violation[]) => {
    background.push(logViolation(session.id, level, index, vs).catch(() => {}));
    if (cfg.logViolations) console.warn(`[level-lock] ${level} sentence ${index}:`, vs.map((v) => `${v.rule} → "${v.excerpt}"`).join(" | "));
  };

  const checkText = (text: string, before: string[] = []) =>
    llm.json({
      model: cfg.checkModel,
      system: checkerSystemPrompt(level, intent),
      prompt: checkerUserPrompt(text, before),
      schema: CheckSchema,
      maxTokens: 300,
      purpose: "check",
    });

  emit({ type: "status", value: "generating" });
  let firstSentenceMs: number | null = null;
  const result = await streamLevelLocked(
    {
      generate: (onText, signal) =>
        llm.chat({
          model: cfg.chatModel,
          system,
          messages,
          maxTokens,
          purpose: "partner",
          level,
          onText,
          signal: inp.signal ? AbortSignal.any([signal, inp.signal]) : signal,
        }),
      check: (s, before) => checkText(s, before),
      fixSentence: (s, before, vs) =>
        llm.chat({
          model: cfg.chatModel,
          system: fixSentenceSystemPrompt(level),
          messages: [{ role: "user", content: fixSentenceUserPrompt(s, before, vs) }],
          maxTokens: 120,
          purpose: "simplify",
          level,
        }),
    },
    {
      level,
      intent,
      allowArabic,
      mode: settings.levelCheckMode,
      previous,
      onViolation: recordViolations,
      onSentence: (text) => {
        if (firstSentenceMs === null) {
          firstSentenceMs = Date.now() - started;
          if (cfg.logViolations) console.info(`[latency] ${level} first sentence ready after ${firstSentenceMs} ms (${intent})`);
        }
        emit({ type: "sentence", text });
      },
    },
  );

  const fallback = result.fallback ? "canned" : result.fixed || result.dropped ? "fixed" : "none";
  emit({ type: "done", text: result.text, fallback, ms: firstSentenceMs ?? Date.now() - started });

  // Everything below happens after the learner already has the reply.
  await userSaved;
  background.push(addTurn(session.id, "partner", result.text, { meta: { fallback, attempts: 1 + result.fixed, greeting: isGreeting } }));
  if (settings.levelCheckMode === "fast") {
    background.push(
      checkAfterTheFact(level, result.text, (t) => checkText(t), intent).then((vs) => {
        if (vs.length) recordViolations(0, vs);
        return updateSession(session.id, { pendingFeedback: vs.length ? regenerationFeedback(level, vs) : null });
      }),
    );
  }
  background.push(summariseIfNeeded(llm, session.id, [...turns, { role: "partner", text: result.text }], session.summary, session.summaryUpto));
  await Promise.allSettled(background);
}

// ---------- "I'm stuck" hint ----------
/** One turn of the scripted (no API key) guided conversation about a book topic. */
async function runScriptedTurn(o: {
  session: SessionRow;
  topic: BookTopic;
  prior: TurnRow[];
  userText: string | undefined;
  inp: TurnInput;
  started: number;
  background: Promise<unknown>[];
}) {
  const { session, topic, prior, userText, inp, started, background } = o;
  const items = scriptFor(topic);
  const lastPartner = [...prior].reverse().find((t) => t.role === "partner");
  const lastAsked = lastPartner ? (parseMeta(lastPartner).bookQ ?? null) : null;
  const finished = lastAsked === 0;
  inp.emit({ type: "status", value: "generating" });

  let reply: string;
  let asked: number;
  if (!userText || lastAsked === null) {
    const first = nextItem(items, null);
    reply = scriptGreeting(topic, first);
    asked = first?.n ?? 0;
  } else if (finished) {
    reply = CLOSING;
    asked = 0;
  } else {
    const item = items.find((x) => x.n === lastAsked) ?? items[0];
    const verdict = judgeAnswer(userText, item);
    const next = nextItem(items, lastAsked);
    const learnerTurns = prior.filter((t) => t.role === "user").length;
    reply = `${reaction(verdict, item, learnerTurns)} ${next ? next.ask : CLOSING}`;
    asked = next?.n ?? 0;
    background.push(
      addTurn(session.id, "user", userText, {
        confidence: inp.confidence ?? null,
        meta: { input: inp.input ?? "voice", alternatives: inp.alternatives?.slice(0, 4), book: { n: verdict.best.n, score: verdict.score } },
      }),
    );
  }
  // One event for the whole reply: the bracketed Arabic must stay together so it is shown, not spoken.
  inp.emit({ type: "sentence", text: reply });
  inp.emit({ type: "done", text: reply, fallback: "none", ms: Date.now() - started });
  await Promise.allSettled(background);
  await addTurn(session.id, "partner", reply, { meta: { bookQ: asked, greeting: !userText } });
}

export const HintSchema = z.object({
  meaning: z.string(),
  hint: z.string(),
  rephrase: z.string(),
  starter: z.string(),
});
export type Hint = z.infer<typeof HintSchema>;

export async function getHint(sessionId: string, llm: LLM = getLLM()): Promise<Hint> {
  const session = await getSession(sessionId);
  if (!session || !isLevel(session.level)) throw new Error("Session not found");
  const level = session.level;
  const lang = (await getSettings(session.userId)).hintLang;
  const turns = await getTurns(sessionId);
  const lastPartner = [...turns].reverse().find((t) => t.role === "partner");
  const recent = turns.slice(-6).map((t) => `${t.role === "user" ? "Learner" : "Partner"}: ${t.text}`).join("\n");
  const hint = await llm.json({
    model: serverConfig().checkModel,
    system: hintSystemPrompt(level, lang),
    prompt: `Recent conversation:\n${recent}\n\nThe learner is stuck on the partner's last message: "${lastPartner?.text ?? ""}"`,
    schema: HintSchema,
    maxTokens: 700,
    purpose: "hint",
    mockContext: { level, lang, partnerText: lastPartner?.text ?? "" },
  });
  // The simpler German rephrase is spoken by the partner, so it must obey the level too.
  if (!heuristicCheck(level, stripArabicHints(hint.rephrase)).ok) hint.rephrase = LEVEL_CONFIG[level].safeFallbacks[0];
  return hint;
}
