import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getTopicByNumber, relatedGrammar, sentencesByNumber } from "@/lib/book";
import { compareSentence } from "@/lib/bookCompare";
import { savePractice } from "@/lib/bookProgress";
import { firstLocked, lockedResponse } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  topic: z.number().int().min(1).max(100).nullable(),
  mode: z.enum(["shadow", "reverse", "review", "grammar"]),
  heard: z.array(z.object({ n: z.number().int().min(1).max(10000), said: z.string().max(600) })).min(1).max(500),
});

// Saves a finished shadowing/review run (already counted in progress by /attempts) for its report.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  const found = await sentencesByNumber(parsed.data.heard.map((h) => h.n));
  const lock = await firstLocked(user.id, [...(parsed.data.topic ? [parsed.data.topic] : []), ...[...found.values()].map((s) => s.topic)]);
  if (lock) return lockedResponse(lock);
  const results = [];
  for (const h of parsed.data.heard) {
    const s = found.get(h.n);
    if (!s) continue;
    const cmp = compareSentence(s.de, h.said);
    const topic = cmp.score < 85 ? await getTopicByNumber(s.topic) : null;
    const g = topic ? relatedGrammar(topic, s.de) : null;
    results.push({ n: s.n, topic: s.topic, de: s.de, ar: s.ar, said: h.said, score: cmp.score, missed: cmp.missed, grammar: g ? { title_de: g.title_de, title_ar: g.title_ar, formula: g.formula } : null });
  }
  const rec = await savePractice(user.id, { topic: parsed.data.topic, mode: parsed.data.mode, results });
  return NextResponse.json({ id: rec.id });
}
