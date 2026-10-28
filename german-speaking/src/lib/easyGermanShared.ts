// Easy German videos per book topic: pieces shared by the server and the browser.

export interface EasyGermanVideo {
  youtubeId: string;
  title: string;
  channel: string;
  url: string;
  /** Added by the admin (stored in the database), not from data/easy-german-videos.json. */
  added?: boolean;
}

export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
export const EASY_GERMAN_CHANNEL_URL = "https://www.youtube.com/@EasyGerman";

/** Progress key in video_progress for one Easy German video. */
export const egKey = (youtubeId: string) => `eg:${youtubeId}`;

/** YouTube search for a topic that has no chosen video yet. */
export const easyGermanSearchUrl = (titleDe: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`Easy German ${titleDe}`).replace(/%20/g, "+")}`;

/** The 11-character video ID from a pasted YouTube link (watch, youtu.be, embed, shorts, live) or a bare ID. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (YOUTUBE_ID.test(s)) return s;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
      id = m?.[2] ?? null;
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}
