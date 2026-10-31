import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { levelOfTopic } from "@/lib/book";
import { isLevel, LEVELS } from "@/lib/levels";
import { lockedResponse, planState, setPlanStart, setPlanStep, topicLock, topicNumbersOf } from "@/lib/plan";
import { PLAN_STEP_IDS, planDuration } from "@/lib/planShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 🗺️ The level plan. GET ?level=A1 → start day, ticked steps (+ notes), duration.
// POST: tick a step, save a note, start (or restart) the plan, or clear the start.

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const level = (new URL(req.url).searchParams.get("level") ?? "").toUpperCase();
  if (!isLevel(level)) return jsonError(400, "invalid_level", "level required");
  const { start, agreed, state } = await planState(user.id, level);
  const topics = topicNumbersOf(level);
  return NextResponse.json({ level, topics, start, agreed, state, duration: planDuration(topics.length) });
}

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("step"), topic: z.number().int().min(1).max(100), step: z.enum(PLAN_STEP_IDS as [string, ...string[]]), done: z.boolean().optional(), note: z.string().max(2000).nullable().optional() }),
  z.object({ action: z.literal("start"), level: z.enum(LEVELS), day: Day.nullable(), agree: z.boolean().optional() }),
]);

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", "Invalid plan action.");
  const b = parsed.data;
  if (b.action === "start") {
    const r = await setPlanStart(user.id, b.level, b.day, b.agree ?? false);
    if (r === "locked_in") return jsonError(409, "plan_locked_in", "You agreed to this plan; it can't be removed.");
    return NextResponse.json({ ok: true });
  }
  if (!levelOfTopic(b.topic)) return jsonError(404, "not_found", "Unknown topic");
  if (b.done === undefined && b.note === undefined) return jsonError(400, "invalid_body", "Nothing to change.");
  const lock = await topicLock(user.id, b.topic);
  if (lock?.locked) return lockedResponse(lock);
  await setPlanStep(user.id, b.topic, b.step as (typeof PLAN_STEP_IDS)[number], { done: b.done, note: b.note });
  return NextResponse.json({ ok: true });
}
