import type { Level } from "./levels";

// URLs of the level pages: /level/a1, /level/a1/topic/3?tab=gemini

export const levelPath = (level: Level | string, rest = "") => `/level/${level.toLowerCase()}${rest}`;
export const topicPath = (level: Level | string, n: number, tab?: string) => levelPath(level, `/topic/${n}${tab ? `?tab=${tab}` : ""}`);
export const LEVEL_COOKIE = "gs_level";
