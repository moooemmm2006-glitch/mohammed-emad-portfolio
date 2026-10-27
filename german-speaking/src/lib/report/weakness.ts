// Weakness tracker: one entry per issue tag (grammar, pronunciation, vocabulary, fluency),
// updated after every report. Pure functions so the rules are easy to test.
//
// Status rules (per session that produced a report):
//   - tag seen for the first time                         → new
//   - seen again and count dropped to ≤ 60% of last time   → improving
//   - seen again otherwise                                → persisting
//   - not seen this session: 1st absence → improving, 2nd consecutive absence → resolved
//   - a resolved tag that shows up again                  → persisting (history marks it as a regression)

import type { WeaknessKind } from "./schema";

export type WeaknessStatus = "new" | "persisting" | "improving" | "resolved";

export interface WeaknessHistoryItem {
  sessionId: string;
  date: string;
  count: number;
  status: WeaknessStatus;
  regressed?: boolean;
}

export interface WeaknessEntry {
  tag: string;
  kind: WeaknessKind;
  firstSeen: string;
  lastSeen: string;
  status: WeaknessStatus;
  totalCount: number;
  absentStreak: number;
  history: WeaknessHistoryItem[];
}

export interface SessionCounts {
  sessionId: string;
  date: string;
  counts: { tag: string; kind: WeaknessKind; count: number }[];
}

const HISTORY_LIMIT = 20;
const IMPROVING_RATIO = 0.6;

export function updateWeaknessTracker(existing: WeaknessEntry[], session: SessionCounts): WeaknessEntry[] {
  const byTag = new Map(existing.map((e) => [e.tag, e]));
  const seen = new Map(session.counts.filter((c) => c.count > 0).map((c) => [c.tag, c]));
  const out: WeaknessEntry[] = [];

  for (const entry of existing) {
    const now = seen.get(entry.tag);
    if (now) {
      const lastCount = lastSeenCount(entry);
      const wasResolved = entry.status === "resolved";
      let status: WeaknessStatus;
      if (wasResolved) status = "persisting";
      else if (lastCount > 0 && now.count <= lastCount * IMPROVING_RATIO) status = "improving";
      else status = "persisting";
      out.push(
        withHistory(
          {
            ...entry,
            kind: now.kind ?? entry.kind,
            lastSeen: session.date,
            status,
            totalCount: entry.totalCount + now.count,
            absentStreak: 0,
          },
          { sessionId: session.sessionId, date: session.date, count: now.count, status, ...(wasResolved ? { regressed: true } : {}) },
        ),
      );
    } else if (entry.status === "resolved") {
      out.push(entry); // stays resolved, no history noise
    } else {
      const absentStreak = entry.absentStreak + 1;
      const status: WeaknessStatus = absentStreak >= 2 ? "resolved" : "improving";
      out.push(withHistory({ ...entry, status, absentStreak }, { sessionId: session.sessionId, date: session.date, count: 0, status }));
    }
  }

  for (const [tag, c] of seen) {
    if (byTag.has(tag)) continue;
    out.push({
      tag,
      kind: c.kind,
      firstSeen: session.date,
      lastSeen: session.date,
      status: "new",
      totalCount: c.count,
      absentStreak: 0,
      history: [{ sessionId: session.sessionId, date: session.date, count: c.count, status: "new" }],
    });
  }

  return out.sort(compareEntries);
}

function lastSeenCount(entry: WeaknessEntry): number {
  for (let i = entry.history.length - 1; i >= 0; i--) {
    if (entry.history[i].count > 0) return entry.history[i].count;
  }
  return 0;
}

function withHistory(entry: WeaknessEntry, item: WeaknessHistoryItem): WeaknessEntry {
  return { ...entry, history: [...entry.history, item].slice(-HISTORY_LIMIT) };
}

const STATUS_ORDER: Record<WeaknessStatus, number> = { persisting: 0, new: 1, improving: 2, resolved: 3 };

function compareEntries(a: WeaknessEntry, b: WeaknessEntry): number {
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.totalCount - a.totalCount || a.tag.localeCompare(b.tag);
}

/** Changes between two tracker states, used to brief the report model and to show "since last time". */
export function diffTracker(before: WeaknessEntry[], after: WeaknessEntry[]) {
  const prev = new Map(before.map((e) => [e.tag, e]));
  const improved: string[] = [];
  const regressed: string[] = [];
  const fresh: string[] = [];
  const unresolved: string[] = [];
  for (const e of after) {
    const p = prev.get(e.tag);
    if (!p) {
      if (e.status === "new") fresh.push(e.tag);
      continue;
    }
    const lastItem = e.history[e.history.length - 1];
    if (lastItem?.regressed) regressed.push(e.tag);
    else if ((e.status === "improving" || e.status === "resolved") && p.status !== "resolved") improved.push(e.tag);
    else if (e.status === "persisting") unresolved.push(e.tag);
  }
  return { improved, regressed, new: fresh, unresolved };
}

/** The tag a partner could gently steer towards next session. */
export function pickFocus(entries: WeaknessEntry[]): WeaknessEntry | null {
  const open = entries.filter((e) => e.kind === "grammar" && (e.status === "persisting" || e.status === "new"));
  open.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.lastSeen.localeCompare(a.lastSeen) || b.totalCount - a.totalCount);
  return open[0] ?? null;
}
