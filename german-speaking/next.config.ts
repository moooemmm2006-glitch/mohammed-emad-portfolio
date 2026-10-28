import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  reactStrictMode: true,
  // Old addresses keep working (301): the pages before v9, and the removed in-site conversation
  // (v11: conversations are in Gemini now) go to the matching level / topic page.
  async redirects() {
    const moved = (source: string, destination: string) => ({ source, destination, statusCode: 301 as const });
    return [
      moved("/speak", "/"),
      moved("/speak/review", "/review"),
      moved("/speak/:level/chat", "/level/:level"),
      moved("/speak/:level/talk", "/level/:level"),
      moved("/speak/:level/topic/:n", "/level/:level/topic/:n"),
      moved("/speak/:level", "/level/:level"),
      moved("/level/:level/chat", "/level/:level"),
      moved("/level/:level/chat/:rest*", "/level/:level"),
      moved("/level/:level/talk", "/level/:level"),
      moved("/level/:level/topic/:n/talk", "/level/:level/topic/:n?tab=gemini"),
      moved("/chat", "/"),
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The microphone is the whole point of the app, so allow it for our own origin only.
          { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
