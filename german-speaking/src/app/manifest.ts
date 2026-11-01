import type { MetadataRoute } from "next";

// "Add to home screen": the site opens like an app on phones and tablets.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sprich Deutsch",
    short_name: "Sprich Deutsch",
    description: "Deutsch sprechen lernen von A1 bis B2 – تعلّم تتكلم ألماني من A1 لحد B2",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#1f3a5f",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
