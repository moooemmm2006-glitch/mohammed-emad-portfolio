// Small text helpers shared by the server (AI texts, stats) and the client (TTS chunking).

/** Split German text into sentences, keeping the end punctuation. */
export function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const parts = cleaned.match(/[^.!?…]+(?:[.!?…]+["“”»«)]*|$)/g) ?? [cleaned];
  return parts.map((s) => s.trim()).filter(Boolean);
}

export function countWords(text: string): number {
  const m = text.trim().match(/[\p{L}\p{N}'-]+/gu);
  return m ? m.length : 0;
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

const AR = "\\u0600-\\u06FF";
// Arabic in round brackets "(الفعل بيروح آخر الجملة)" …
const ARABIC_HINT = new RegExp(`\\s*\\([^()]*[${AR}][^()]*\\)`, "g");
// … or a run of Arabic words (with Arabic punctuation).
const ARABIC_RUN = new RegExp(`[${AR}][${AR}\\s،؛؟.,!:«»"\\-–]*`, "g");

/** Remove Arabic (bracketed hints and Arabic sentences) before German text-to-speech. */
export function stripArabicHints(text: string): string {
  return text
    .replace(ARABIC_HINT, "")
    .replace(ARABIC_RUN, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
