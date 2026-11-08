import type { Demo } from "./repo";
import { isExpired } from "./expiry";
import { siteUrl } from "./owner";

export type DemoDTO = Omit<Demo, never> & { expired: boolean; url: string; siteUrl: string };

export function toDTO(d: Demo, now = Date.now()): DemoDTO {
  const base = siteUrl();
  return { ...d, expired: isExpired(d.expiresAt, now), url: `${base}/demo/${d.slug}`, siteUrl: `${base}/s/${d.slug}` };
}
