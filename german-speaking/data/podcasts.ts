/** Episodes verified by the site owner on the official DKW Akademie channel. */
export interface PodcastSeed {
  youtubeId: string;
  title: string;
  channel: string;
  levels: ("B1" | "B2")[];
}

export const DKW_CHANNEL_URL = "https://www.youtube.com/@dkwakademie";
export const DKW_CHANNEL_ID = "UCVU6C-LO-qDNHYLX0-2Sfdw";

// Newest first. IDs and titles were supplied and checked by the site owner.
export const podcasts: PodcastSeed[] = [
  {
    youtubeId: "kaSAeFMlYpA",
    title: "DKW Podcast | Ep07 | Europa und seine Muslime | Elsayed Elshahed | Mazen Soliman",
    channel: "DKW Akademie",
    levels: ["B1", "B2"],
  },
  {
    youtubeId: "2M7n_vavkJc",
    title: "DKW Podcast | Ep06 | Kultur entdecken: Lothar Bunn | Mazen Soliman",
    channel: "DKW Akademie",
    levels: ["B1", "B2"],
  },
];
