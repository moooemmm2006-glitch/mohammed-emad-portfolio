import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Always render <title>/<meta>/OG tags in <head> (WhatsApp previews, SEO), never streamed later.
  htmlLimitedBots: /.*/,
  serverExternalPackages: ["@libsql/client", "libsql", "@resvg/resvg-js"],
  // The share images read these fonts at runtime.
  outputFileTracingIncludes: { "/api/og/[slug]": ["./assets/fonts/**"], "/api/mockup/[slug]": ["./assets/fonts/**"] },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    ];
    return [
      { source: "/(.*)", headers: base },
      { source: "/studio/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      { source: "/studio", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      { source: "/demo/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
