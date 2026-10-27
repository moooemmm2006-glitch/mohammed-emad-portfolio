import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { PREPAINT_SCRIPT, UIProvider } from "@/lib/client/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "اتكلم ألماني · Sprich Deutsch",
  description: "Speaking-first German practice with level-locked AI conversation partners (A1–B2).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <UIProvider>
          <AppShell>{children}</AppShell>
        </UIProvider>
      </body>
    </html>
  );
}
