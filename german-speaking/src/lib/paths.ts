import type { Level } from "./levels";

// URLs of the level pages: /level/a1, /level/a1/topic/3, /level/a1/chat?session=…

export const levelPath = (level: Level | string, rest = "") => `/level/${level.toLowerCase()}${rest}`;
export const topicPath = (level: Level | string, n: number, tab?: string) => levelPath(level, `/topic/${n}${tab ? `?tab=${tab}` : ""}`);
export const chatPath = (level: Level | string, sessionId: string, isNew = false) => levelPath(level, `/chat?session=${sessionId}${isNew ? "&new=1" : ""}`);
export const LEVEL_COOKIE = "gs_level";
