// Turn transcript: collects everything the learner says during ONE turn, across pauses and
// across automatic restarts of the speech recogniser. Pure logic (no browser APIs) so it is
// unit-tested.

export interface Segment {
  text: string;
  isFinal: boolean;
  confidence: number | null;
  alternatives: string[];
}

export interface TurnResult {
  text: string;
  confidence: number | null;
  alternatives: string[];
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Join recogniser segments into one text. Chrome on Android sometimes repeats the whole phrase
 * so far in each new segment ("ich", "ich habe", "ich habe Zeit"); a segment that starts with
 * the previous one replaces it instead of being appended.
 */
export function joinSegments(segments: string[]): string {
  const out: string[] = [];
  for (const raw of segments) {
    const s = clean(raw);
    if (!s) continue;
    const prev = out[out.length - 1];
    if (prev && s.toLowerCase().startsWith(prev.toLowerCase())) out[out.length - 1] = s;
    else if (prev && prev.toLowerCase().startsWith(s.toLowerCase())) continue;
    else out.push(s);
  }
  return out.join(" ");
}

export class TurnTranscript {
  private committed: Segment[] = [];
  private session: Segment[] = [];

  constructor(seed?: string) {
    if (seed && clean(seed)) this.committed.push({ text: clean(seed), isFinal: true, confidence: null, alternatives: [] });
  }

  /** Replace the current recogniser session's results (the browser always sends the full list). */
  update(results: Segment[]) {
    this.session = results.map((r) => ({ ...r, text: clean(r.text) })).filter((r) => r.text);
  }

  /** The recogniser stopped (pause, timeout, restart): keep what it heard, including unfinished words. */
  commitSession() {
    this.committed.push(...this.session.map((s) => ({ ...s, isFinal: true })));
    this.session = [];
  }

  get hasSpeech(): boolean {
    return this.text().length > 0;
  }

  /** Everything heard so far in this turn (live view, includes interim words). */
  text(): string {
    return joinSegments([...this.committed, ...this.session].map((s) => s.text));
  }

  /** The whole turn as one message, or null if nothing was said. */
  result(): TurnResult | null {
    const all = [...this.committed, ...this.session];
    const text = joinSegments(all.map((s) => s.text));
    if (!text) return null;
    const confs = all.map((s) => s.confidence).filter((c): c is number => c !== null && c > 0);
    return {
      text,
      confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null,
      alternatives: all.flatMap((s) => s.alternatives).filter(Boolean).slice(0, 4),
    };
  }
}
