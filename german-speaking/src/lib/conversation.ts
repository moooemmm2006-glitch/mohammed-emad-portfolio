// Server-side orchestration of one partner turn: save the learner's words, build the context
// (with summarised older turns), generate a level-locked reply and save it.

import { z } from "zod";
import { serverConfig } from "./config";
import { addTurn, getSession, getSettings, getTurns, logViolation, updateSession, type TurnRow } from "./db/repo";
import { checkAfterTheFact, CheckSchema, levelLockedReply, type LockStatus, type Violation } from "./levelLock";
import { heuristicCheck } from "./levelLock/heuristics";
import { isLevel, LEVEL_CONFIG, type Level } from "./levels";
import { getLLM, type ChatMessage, type LLM } from "./llm";
import {
  buildPartnerSystemPrompt,
  checkerSystemPrompt,
  checkerUserPrompt,
  hintSystemPrompt,
  regenerationFeedback,
  simplifySystemPrompt,
  START_SIGNAL,
  summarySystemPrompt,
} from "./prompts";
import { SentenceBuffer, splitSentences } from "./text";

export type TurnEvent =
  | { type: "status"; value: LockStatus | "listening" }
  | { type: "user_saved"; turnId: number }
  | { type: "sentence"; text: string }
  | { type: "done"; turnId: number; text: string; fallback: string; attempts: number }
  | { type: "error"; code: string; message: string };

// Keep the last N turns verbatim; older ones are folded into a running summary.
const KEEP_RECENT = 12;
const SUMMARISE_AFTER = 20;

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

async function maybeSummarise(llm: LLM, sessionId: string, turns: TurnRow[], summary: string | null, upto: number) {
  if (turns.length - upto <= SUMMARISE_AFTER) return { summary, upto };
  const cut = turns.length - KEEP_RECENT;
  const older = turns.slice(upto, cut);
  const text = older.map((t) => `${t.role === "user" ? "Learner" : "Partner"}: ${t.text}`).join("\n");
  try {
    const newSummary = await llm.chat({
      model: serverConfig().checkModel,
      system: summarySystemPrompt(),
      messages: [{ role: "user", content: `${summary ? `Previous summary: ${summary}\n\n` : ""}Conversation:\n${text}` }],
      maxTokens: 300,
      purpose: "summary",
    });
    updateSession(sessionId, { summary: newSummary, summaryUpto: cut });
    return { summary: newSummary, upto: cut };
  } catch {
    return { summary, upto }; // not critical: keep the full context this time
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
  const { emit } = inp;
  const session = getSession(inp.sessionId);
  if (!session || !isLevel(session.level)) {
    emit({ type: "error", code: "not_found", message: "Session not found" });
    return;
  }
  if (session.status !== "active") updateSession(session.id, { status: "active", endedAt: null });
  const level: Level = session.level;
  const settings = getSettings();
  const cfg = serverConfig();
  const llm = inp.llm ?? getLLM();

  const userText = inp.userText?.trim();
  if (userText) {
    const row = addTurn(session.id, "user", userText, {
      confidence: inp.confidence ?? null,
      meta: { input: inp.input ?? "voice", alternatives: inp.alternatives?.slice(0, 4) },
    });
    emit({ type: "user_saved", turnId: row.id });
  }

  const turns = getTurns(session.id);
  const isGreeting = turns.length === 0;
  const { summary, upto } = await maybeSummarise(llm, session.id, turns, session.summary, session.summaryUpto);
  const messages = toMessages(turns.slice(upto), upto === 0);

  const system =
    buildPartnerSystemPrompt({
      level,
      topic: session.topic,
      correctionMode: settings.correctionMode,
      focus: settings.focusSteering && session.focusTag ? { tag: session.focusTag } : null,
      summary,
    }) + (session.pendingFeedback ?? "");

  const maxTokens = LEVEL_CONFIG[level].limits.maxTokens;
  const check = (text: string) =>
    llm.json({
      model: cfg.checkModel,
      system: checkerSystemPrompt(level),
      prompt: checkerUserPrompt(text),
      schema: CheckSchema,
      maxTokens: 600,
      purpose: "check",
    });

  const recordViolations = (attempt: number, vs: Violation[]) => {
    logViolation(session.id, level, attempt, vs);
    if (cfg.logViolations) console.warn(`[level-lock] ${level} attempt ${attempt}:`, vs.map((v) => `${v.rule} → "${v.excerpt}"`).join(" | "));
  };

  let finalText: string;
  let fallback = "none";
  let attempts = 1;

  if (settings.levelCheckMode === "fast") {
    // Stream sentences straight to the browser; validate afterwards and steer the next turn.
    emit({ type: "status", value: "generating" });
    const buf = new SentenceBuffer();
    finalText = await llm.chat({
      model: cfg.chatModel,
      system,
      messages,
      maxTokens,
      purpose: "partner",
      level,
      signal: inp.signal,
      onText: (d) => buf.push(d).forEach((s) => emit({ type: "sentence", text: s })),
    });
    buf.flush().forEach((s) => emit({ type: "sentence", text: s }));
    const vs = await checkAfterTheFact(level, finalText, check);
    if (vs.length) recordViolations(0, vs);
    updateSession(session.id, { pendingFeedback: vs.length ? regenerationFeedback(level, vs) : null });
  } else {
    const result = await levelLockedReply(
      {
        generate: (feedback) =>
          llm.chat({ model: cfg.chatModel, system: system + (feedback ?? ""), messages, maxTokens, purpose: "partner", level, signal: inp.signal }),
        check,
        simplify: (text) =>
          llm.chat({
            model: cfg.chatModel,
            system: simplifySystemPrompt(level),
            messages: [{ role: "user", content: text }],
            maxTokens,
            purpose: "simplify",
            level,
          }),
      },
      { level, onStatus: (s) => emit({ type: "status", value: s }), onViolation: recordViolations },
    );
    finalText = result.text;
    fallback = result.fallback;
    attempts = result.attempts;
    for (const s of splitSentences(finalText)) emit({ type: "sentence", text: s });
  }

  const row = addTurn(session.id, "partner", finalText, { meta: { fallback, attempts, greeting: isGreeting } });
  emit({ type: "done", turnId: row.id, text: finalText, fallback, attempts });
}

// ---------- "I'm stuck" hint ----------
export const HintSchema = z.object({
  meaning: z.string(),
  hint: z.string(),
  rephrase: z.string(),
  starter: z.string(),
});
export type Hint = z.infer<typeof HintSchema>;

export async function getHint(sessionId: string, llm: LLM = getLLM()): Promise<Hint> {
  const session = getSession(sessionId);
  if (!session || !isLevel(session.level)) throw new Error("Session not found");
  const level = session.level;
  const lang = getSettings().hintLang;
  const turns = getTurns(sessionId);
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
  if (!heuristicCheck(level, hint.rephrase).ok) hint.rephrase = LEVEL_CONFIG[level].safeFallbacks[0];
  return hint;
}
