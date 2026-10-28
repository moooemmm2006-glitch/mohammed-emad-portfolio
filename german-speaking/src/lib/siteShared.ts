// The owner's YouTube channel, the "how to use the site" video, the tutorials playlist and the vlogs
// (☕ استراحة): pieces shared by the server and the browser.

import { parseYouTubeId } from "./easyGermanShared";

export { parseYouTubeId };

/** Mohamed Emad | مُحَمَّد عِمَاد — the default for "رابط قناتي" (the admin can change it). */
export const DEFAULT_CHANNEL_URL = "https://www.youtube.com/@mohammedemad-ilden";
export const DEFAULT_CHANNEL_ID = "UCwjFZpJ56bU7SdkMGlFuqQw";
export const CHANNEL_NAME = "Mohamed Emad | مُحَمَّد عِمَاد";
/** The first vlog ("vlog in Goethe 🇩🇪"), checked on YouTube by the owner. */
export const FIRST_VLOG = { youtubeId: "qALULLsNpbc", title: "vlog in Goethe 🇩🇪", description_ar: "يوم من أيامي في معهد Goethe في ألمانيا." };

export interface SiteLinks {
  /** Clean channel URL, or null when the admin removed it. */
  channelUrl: string | null;
  /** The explainer video (11-character ID), or null until it is set. */
  explainerId: string | null;
  /** Tutorials playlist ID, or null. */
  playlistId: string | null;
  /** The channel photo (small data URL), or null → initials "M". */
  channelPhoto: string | null;
}

export interface Vlog {
  youtubeId: string;
  title: string;
  description_ar: string;
  addedAt: number;
}

/** Where a channel button was clicked (counted on the admin page). */
export const CLICK_PLACES = ["footer", "level_end", "menu", "explainer", "pause", "tutorials"] as const;
export type ClickPlace = (typeof CLICK_PLACES)[number];

/**
 * A YouTube channel link in its clean form (no tracking like ?si=): youtube.com/@handle,
 * /channel/UC…, /c/name or /user/name. A bare "@handle" works too. null if it isn't one.
 */
export function parseChannelUrl(input: string): string | null {
  const s = input.trim();
  if (/^@[\w.-]{3,100}$/.test(s)) return `https://www.youtube.com/${s}`;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  if (host !== "youtube.com") return null;
  const m = u.pathname.match(/^\/(@[\w.-]{3,100}|channel\/UC[\w-]{22}|c\/[\w.-]{1,100}|user\/[\w.-]{1,100})\/?/);
  return m ? `https://www.youtube.com/${decodeURIComponent(m[1])}` : null;
}

const PLAYLIST_ID = /^(PL|OL|UU|FL|LL|RD)[\w-]{10,64}$/;

/** The playlist ID from a link with list=… (or a bare ID). */
export function parsePlaylistId(input: string): string | null {
  const s = input.trim();
  if (PLAYLIST_ID.test(s)) return s;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
    if (host !== "youtube.com" && host !== "youtu.be" && host !== "youtube-nocookie.com") return null;
    const id = u.searchParams.get("list");
    return id && PLAYLIST_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Is a video's channel (oEmbed author_url) the owner's channel? */
export function isOwnChannel(authorUrl: string, channelUrl: string | null): boolean {
  const a = parseChannelUrl(authorUrl)?.toLowerCase();
  const c = channelUrl ? parseChannelUrl(channelUrl)?.toLowerCase() : null;
  if (a && c && a === c) return true;
  // The default channel is also known by its ID (YouTube may answer with /channel/UC…).
  return authorUrl.includes(DEFAULT_CHANNEL_ID) && (!channelUrl || channelUrl.toLowerCase() === DEFAULT_CHANNEL_URL.toLowerCase());
}

/** Calendar day (YYYY-MM-DD) in the learner's own time zone. */
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "برافو! عايز تاخد استراحة؟" at most once a day. */
export const shouldOfferPause = (lastShownDay: string | null | undefined, today: string) => lastShownDay !== today;
