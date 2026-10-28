import { createHash } from "crypto";
import { nicosWeg } from "../../data/videos";

// DW "Video-Thema" (B2): the official podcast feed, fetched and parsed on the server only and cached.
// Episodes are played from the feed's own enclosure link (like a podcast app); nothing is re-hosted.

export interface Episode {
  /** Stable id from the feed's guid/link (used for watched progress). */
  id: string;
  title: string;
  /** ISO date */
  date: string | null;
  /** Short plain-text description. */
  summary: string;
  /** Longer text from the feed (manuscript/description), plain text, if any. */
  text: string | null;
  /** The episode page on DW. */
  link: string | null;
  videoUrl: string;
  videoType: string;
  image: string | null;
  duration: string | null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", bdquo: "„", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", eacute: "é" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

/** Text content of a tag: CDATA unwrapped, entities decoded. */
function tag(xml: string, name: string): string | null {
  const re = new RegExp(`<${name.replace(":", "\\:")}(?:\\s[^>]*)?>([\\s\\S]*?)</${name.replace(":", "\\:")}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1].trim() : decodeEntities(raw);
}

function attr(xml: string, name: string, attribute: string): string | null {
  const m = xml.match(new RegExp(`<${name.replace(":", "\\:")}\\s[^>]*?${attribute}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? decodeEntities(m[2] ?? m[3] ?? "") : null;
}

/** HTML (as found in descriptions) → readable plain text. Never rendered as HTML. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

/** Only http(s) links; http is upgraded so the video plays on an https site. */
function safeUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

const isVideo = (url: string, type: string | null) => (type ? type.startsWith("video/") : /\.(mp4|m4v|mov|webm)(\?|$)/i.test(url));

export function parseFeed(xml: string, limit = 20): Episode[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const out: Episode[] = [];
  for (const item of items) {
    const enclosure = safeUrl(attr(item, "enclosure", "url") ?? attr(item, "media:content", "url"));
    const type = attr(item, "enclosure", "type") ?? attr(item, "media:content", "type");
    if (!enclosure || !isVideo(enclosure, type)) continue;
    const title = htmlToText(tag(item, "title") ?? "").slice(0, 300);
    if (!title) continue;
    const link = safeUrl(tag(item, "link"));
    const guid = tag(item, "guid") ?? link ?? enclosure;
    const pub = tag(item, "pubDate");
    const date = pub && !Number.isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : null;
    const desc = htmlToText(tag(item, "description") ?? tag(item, "itunes:summary") ?? "");
    const long = htmlToText(tag(item, "content:encoded") ?? tag(item, "itunes:summary") ?? "");
    const text = long && long.length > desc.length + 40 ? long : desc.length > 400 ? desc : null;
    out.push({
      id: createHash("sha1").update(guid).digest("hex").slice(0, 16),
      title,
      date,
      summary: desc.length > 400 ? `${desc.slice(0, 380).trim()}…` : desc,
      text: text ? text.slice(0, 20000) : null,
      link,
      videoUrl: enclosure,
      videoType: type ?? "video/mp4",
      image: safeUrl(attr(item, "itunes:image", "href") ?? attr(item, "media:thumbnail", "url")),
      duration: tag(item, "itunes:duration"),
    });
  }
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, limit);
}

export const FEED_REVALIDATE_S = 12 * 60 * 60;

// Last good list in this server instance, used when DW can't be reached.
const g = globalThis as unknown as { __gsVideoThema?: { at: number; episodes: Episode[] } };

export interface FeedResult {
  episodes: Episode[];
  /** "live" = fetched now (or from Next's 12h cache), "stale" = last good copy, "error" = nothing available */
  status: "live" | "stale" | "error";
  fetchedAt: number | null;
}

export async function getVideoThema(fetcher: typeof fetch = fetch): Promise<FeedResult> {
  try {
    // VIDEO_THEMA_FEED_URL only overrides the feed for local tests; the official feed is in data/videos.ts.
    const res = await fetcher(process.env.VIDEO_THEMA_FEED_URL || nicosWeg.B2.feedUrl, {
      next: { revalidate: FEED_REVALIDATE_S },
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(10_000),
    } as RequestInit);
    if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
    const episodes = parseFeed(await res.text());
    if (!episodes.length) throw new Error("feed has no video episodes");
    g.__gsVideoThema = { at: Date.now(), episodes };
    return { episodes, status: "live", fetchedAt: g.__gsVideoThema.at };
  } catch (err) {
    console.warn("[video-thema] feed unavailable:", err instanceof Error ? err.message : err);
    const cached = g.__gsVideoThema;
    return cached ? { episodes: cached.episodes, status: "stale", fetchedAt: cached.at } : { episodes: [], status: "error", fetchedAt: null };
  }
}

/** Test helper. */
export function resetVideoThemaCache() {
  delete g.__gsVideoThema;
}
