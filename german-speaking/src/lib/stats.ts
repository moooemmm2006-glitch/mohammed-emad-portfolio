import { getWeaknesses, listReports, sessionsWithTurnCounts } from "./db/repo";
import { LEVELS, type Level } from "./levels";
import { countWords } from "./text";
import { ScoreKeys } from "./report/schema";

/** YYYY-MM-DD in the learner's timezone (offset in minutes, as from Date#getTimezoneOffset). */
export function dayKey(ms: number, tzOffsetMin: number): string {
  return new Date(ms - tzOffsetMin * 60_000).toISOString().slice(0, 10);
}

export function practiceStreak(days: Set<string>, today: string): number {
  const d = new Date(`${today}T00:00:00Z`);
  // A streak is still alive if the last practice was yesterday.
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (days.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

export async function computeStats(tzOffsetMin = 0, now = Date.now()) {
  const all = await sessionsWithTurnCounts();
  const reports = await listReports();
  const reportBySession = new Map(reports.map((r) => [r.session.sessionId, r]));
  const spoken = all.filter((x) => x.userTurns > 0);

  const perDay = new Map<string, { minutes: number; words: number; sessions: number }>();
  let totalSec = 0;
  let totalWords = 0;
  for (const { session, turns } of spoken) {
    const sec = Math.max(0, ((session.endedAt ?? session.lastActiveAt) - session.startedAt) / 1000);
    const words = turns.filter((t) => t.role === "user").reduce((n, t) => n + countWords(t.text), 0);
    totalSec += sec;
    totalWords += words;
    const k = dayKey(session.startedAt, tzOffsetMin);
    const cur = perDay.get(k) ?? { minutes: 0, words: 0, sessions: 0 };
    perDay.set(k, { minutes: cur.minutes + sec / 60, words: cur.words + words, sessions: cur.sessions + 1 });
  }

  const today = dayKey(now, tzOffsetMin);
  const days: { day: string; minutes: number; words: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const k = dayKey(now - i * 86_400_000, tzOffsetMin);
    const v = perDay.get(k);
    days.push({ day: k, minutes: Math.round((v?.minutes ?? 0) * 10) / 10, words: v?.words ?? 0 });
  }

  const weeks = new Map<string, number>();
  for (const [k, v] of perDay) {
    const d = new Date(`${k}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
    const wk = d.toISOString().slice(0, 10);
    weeks.set(wk, (weeks.get(wk) ?? 0) + v.minutes);
  }

  const scoreTimeline = reports.map((r) => ({
    sessionId: r.session.sessionId,
    date: r.session.date.slice(0, 10),
    level: r.session.level,
    overall: r.overall,
    ...Object.fromEntries(ScoreKeys.map((k) => [k, r.scores[k]])),
  }));

  const tagTotals = new Map<string, number>();
  for (const r of reports) for (const w of r.weaknessCounts) tagTotals.set(w.tag, (tagTotals.get(w.tag) ?? 0) + w.count);
  const topTags = [...tagTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  const mistakeTrend = reports.map((r) => {
    const row: Record<string, string | number> = { date: r.session.date.slice(0, 10) };
    for (const t of topTags) row[t] = r.weaknessCounts.find((w) => w.tag === t)?.count ?? 0;
    return row;
  });

  const levels = Object.fromEntries(
    LEVELS.map((l) => {
      const s = spoken.find((x) => x.session.level === l); // sessions are newest first
      const r = s ? reportBySession.get(s.session.id) : undefined;
      const lastReport = [...reports].reverse().find((x) => x.session.level === l);
      return [l, { lastSessionAt: s?.session.startedAt ?? null, lastScore: (r ?? lastReport)?.overall ?? null, sessions: spoken.filter((x) => x.session.level === l).length }];
    }),
  ) as Record<Level, { lastSessionAt: number | null; lastScore: number | null; sessions: number }>;

  const history = all
    .filter((x) => x.userTurns > 0)
    .map(({ session, userTurns }) => ({
      id: session.id,
      level: session.level,
      topic: session.topic,
      startedAt: session.startedAt,
      status: session.status,
      userTurns,
      overall: reportBySession.get(session.id)?.overall ?? null,
      hasReport: reportBySession.has(session.id),
    }));

  return {
    totals: {
      sessions: spoken.length,
      minutes: Math.round(totalSec / 60),
      words: totalWords,
      streak: practiceStreak(new Set(perDay.keys()), today),
      reports: reports.length,
    },
    days,
    weeks: [...weeks.entries()].sort().slice(-8).map(([week, minutes]) => ({ week, minutes: Math.round(minutes) })),
    scoreTimeline,
    topTags,
    mistakeTrend,
    levels,
    weaknesses: await getWeaknesses(),
    history,
    unfinished: history.filter((h) => !h.hasReport),
  };
}

export type Stats = Awaited<ReturnType<typeof computeStats>>;
