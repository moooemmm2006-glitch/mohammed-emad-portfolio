import { YOUTUBE_ID } from "./easyGermanShared";

export const YOUTUBE_PLAYLIST_ID = /^[A-Za-z0-9_-]{10,80}$/;
export const DKW_CHANNEL_ID = "UCVU6C-LO-qDNHYLX0-2Sfdw";
export const DKW_CHANNEL_URL = "https://www.youtube.com/@dkwakademie";

export interface PodcastItem {
  id: string;
  youtubeId?: string;
  playlistId?: string;
  title: string;
  channel: string;
  levels: ("B1" | "B2")[];
  addedAt?: number;
  added?: boolean;
}

export function parseYouTubeSource(input: string): { youtubeId?: string; playlistId?: string } | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "").toLowerCase();
  if (!new Set(["youtube.com", "youtube-nocookie.com", "youtu.be"]).has(host)) return null;
  const videoId = host === "youtu.be" ? url.pathname.split("/")[1] : url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1];
  const listId = url.searchParams.get("list") ?? (url.pathname === "/playlist" ? url.searchParams.get("list") : null);
  if (videoId && YOUTUBE_ID.test(videoId)) return { youtubeId: videoId };
  if (listId && YOUTUBE_PLAYLIST_ID.test(listId)) return { playlistId: listId };
  return null;
}

export const podcastProgressKey = (item: Pick<PodcastItem, "youtubeId" | "playlistId">) => item.youtubeId ? `pod:${item.youtubeId}` : `podlist:${item.playlistId}`;

