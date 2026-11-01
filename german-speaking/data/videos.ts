// DW video series per level — the only place with video IDs. Change them here; no component holds an ID.
// Only the official videos are embedded (youtube-nocookie player) or played from DW's own feed;
// nothing is downloaded, re-uploaded or cut.

export interface NicosWegLevel {
  /** Full movie of the level (all episodes in one video). */
  movieId: string;
  /** Official playlist with all A1–B1 episodes in order. */
  playlistId: string;
  /** 1-based index of the level's "Folge 1" in the playlist; null = not verified, only the movie is shown. */
  playlistStartIndex: number | null;
}

export interface VideoThemaLevel {
  series: "Video-Thema";
  /** Official DW podcast feed (RSS with the video files). */
  feedUrl: string;
  /** Apple Podcasts page, for reference/credit. */
  podcastPage: string;
}

export const nicosWeg: { A1: NicosWegLevel; A2: NicosWegLevel; B1: NicosWegLevel; B2: VideoThemaLevel } = {
  A1: { movieId: "4-eDoThe6qo", playlistId: "PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg", playlistStartIndex: 1 },
  // A2/B1 start positions in the playlist could not be verified yet → only the full movie is shown.
  A2: { movieId: "Lg5P2w_Ro1c", playlistId: "PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg", playlistStartIndex: null },
  B1: { movieId: "LkufozluseI", playlistId: "PLs7zUO7VPyJ5DV1iBRgSw2uDl832n0bLg", playlistStartIndex: null },
  B2: {
    series: "Video-Thema",
    feedUrl: "https://rss.dw.com/xml/DKpodcast_videothema_de",
    podcastPage: "https://podcasts.apple.com/us/podcast/video-thema-videos-dw-deutsch-lernen/id322542709",
  },
};

export const DW_COURSE_URL = "https://learngerman.dw.com";
/** The owner's own video: how to study Nicos Weg and get the most out of it (shown under the movie). */
export const NICOS_STUDY_GUIDE_ID = "LSfqMq72Qjk";
export const NICOS_WEG_CREDIT = "Nicos Weg – Deutsche Welle (DW)";
export const VIDEO_THEMA_CREDIT = "Video-Thema – Deutsche Welle (DW)";

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youtubePlaylistUrl = (list: string, index?: number | null) =>
  `https://www.youtube.com/playlist?list=${list}${index ? `&index=${index}` : ""}`;
/** Privacy-enhanced embed (no cookies until the learner plays). */
export const youtubeEmbedUrl = (id: string, start = 0) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&enablejsapi=1${start > 0 ? `&start=${Math.floor(start)}` : ""}`;
export const youtubePlaylistEmbedUrl = (list: string, index: number) =>
  `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&index=${index}&rel=0&playsinline=1`;
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
/** Sharp, original thumbnails we host ourselves (YouTube's hqdefault is small and blurry). */
export const LOCAL_POSTERS: Record<string, string> = { qALULLsNpbc: "/media/vlogs/qALULLsNpbc.webp" };
export const posterFor = (id: string) => LOCAL_POSTERS[id] ?? youtubeThumb(id);
