import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  reactStrictMode: true,
  // Old addresses (before v9) keep working.
  async redirects() {
    return [
      { source: "/speak", destination: "/", permanent: false },
      { source: "/speak/review", destination: "/review", permanent: false },
      { source: "/speak/:level/chat", destination: "/level/:level/chat", permanent: false },
      { source: "/speak/:level/topic/:n", destination: "/level/:level/topic/:n", permanent: false },
      { source: "/speak/:level", destination: "/level/:level", permanent: false },
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
