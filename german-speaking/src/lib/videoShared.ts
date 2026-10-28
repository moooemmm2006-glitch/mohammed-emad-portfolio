// Video progress helpers shared by the browser and the server (no database code here).

export const VIDEO_KEY = /^(nicos:(A1|A2|B1):(movie|playlist)|vt:[0-9a-f]{16})$/;

export interface VideoState {
  key: string;
  position: number;
  duration: number | null;
  watched: boolean;
  updatedAt: number;
}

/** 0–100 for one video: finished = 100, otherwise how far it was watched. */
export function percentOf(v: VideoState | undefined): number {
  if (!v) return 0;
  if (v.watched) return 100;
  return v.duration ? Math.min(99, Math.round((100 * v.position) / v.duration)) : 0;
}
