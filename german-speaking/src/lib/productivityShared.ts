import { parseYouTubeId } from "./easyGermanShared";

// 🎯 "الإنتاجية وتنظيم الوقت": creators the owner recommends (their own YouTube videos via the
// official embed, links to their courses, and a subscribe link to their channel). No photos of them.

export const CREATORS = ["abouzeid"] as const;
export type Creator = (typeof CREATORS)[number];
export const CREATOR_INFO: Record<Creator, { ar: string; latin: string; initials: string; channel: string }> = {
  abouzeid: { ar: "أحمد أبو زيد", latin: "Ahmed Abouzeid", initials: "AZ", channel: "دروس أونلاين" },
};

/** The owner's picks, each added once (its own flag); the admin can delete one and it stays deleted.
 *  A featured seed is skipped when the admin already chose a featured video. */
export const PRODUCTIVITY_SEED: { flag: string; creator: Creator; kind: "video" | "featured"; youtubeId: string; title: string }[] = [
  { flag: "productivity_seeded_v1", creator: "abouzeid", kind: "video", youtubeId: "7nmKtI7fEmU", title: "تعلّم كيف تتعلّم" },
  { flag: "productivity_seeded_featured_v1", creator: "abouzeid", kind: "featured", youtubeId: "3acWaDehEiU", title: "غيّر حياتك كلها في يوم" },
];
/** "featured": one video shown at the very top of the home page. */
export const PRODUCTIVITY_KINDS = ["video", "course", "channel", "featured"] as const;
export type ProductivityKind = (typeof PRODUCTIVITY_KINDS)[number];

export interface ProductivityItem {
  id: string;
  creator: Creator;
  kind: ProductivityKind;
  title: string;
  url: string;
  youtubeId: string | null;
}

/** A plain https link (no credentials), or null. */
export function cleanHttpsUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

/** A YouTube channel link (/@handle, /channel/…, /c/…, /user/…), cleaned; null otherwise. */
export function cleanChannelUrl(raw: string): string | null {
  const url = cleanHttpsUrl(raw.startsWith("http") ? raw : `https://${raw}`);
  if (!url) return null;
  const u = new URL(url);
  if (!YT_HOSTS.has(u.hostname)) return null;
  const m = u.pathname.match(/^\/(@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)\/?/);
  return m ? `https://www.youtube.com/${m[1]}` : null;
}

/** The channel link with YouTube's own "subscribe?" prompt. */
export const subscribeUrl = (channelUrl: string) => `${channelUrl}?sub_confirmation=1`;

export { parseYouTubeId };
