// Small text helpers shared by the server (level checks, reports) and the client (TTS chunking).

/** Split German text into sentences, keeping the end punctuation. */
export function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const parts = cleaned.match(/[^.!?…]+(?:[.!?…]+["“”»«)]*|$)/g) ?? [cleaned];
  return parts.map((s) => s.trim()).filter(Boolean);
}

/**
 * Incremental splitter for streamed text: feed chunks, get back completed sentences.
 * A sentence counts as complete once it ends in . ! ? … and is followed by whitespace.
 */
export class SentenceBuffer {
  private buf = "";

  push(chunk: string): string[] {
    this.buf += chunk;
    const out: string[] = [];
    let m: RegExpMatchArray | null;
    // Require a following space so "z.B." or "3.5" mid-stream don't split early.
    while ((m = this.buf.match(/^(.*?[.!?…]+["“”»«)]*)\s+/s))) {
      const sentence = m[1].trim();
      if (sentence) out.push(sentence);
      this.buf = this.buf.slice(m[0].length);
    }
    return out;
  }

  flush(): string[] {
    const rest = this.buf.trim();
    this.buf = "";
    return rest ? [rest] : [];
  }
}

export function countWords(text: string): number {
  const m = text.trim().match(/[\p{L}\p{N}'-]+/gu);
  return m ? m.length : 0;
}

export function tokenizeWords(text: string): string[] {
  return text.match(/[\p{L}\p{N}'-]+/gu) ?? [];
}

/** Pull the first JSON object/array out of a model response (handles ```json fences and chatter). */
export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.search(/[{[]/);
  if (start < 0) throw new Error("No JSON found in model output");
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return JSON.parse(body.slice(start, i + 1));
    }
  }
  throw new Error("Unterminated JSON in model output");
}
