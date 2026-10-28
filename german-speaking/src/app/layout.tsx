import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { MotionProvider } from "@/lib/client/motion";
import { PREPAINT_SCRIPT, UIProvider } from "@/lib/client/ui";
import { MeProvider } from "@/lib/client/me";
import { dirOf, isUILang, LANG_COOKIE, type UILang } from "@/lib/client/i18n";
import { DICT } from "@/lib/messages";
import { serverConfig } from "@/lib/config";
import { dbTarget } from "@/lib/db";
import { ProvidersProvider } from "@/components/ProvidersProvider";
import { SiteProvider } from "@/components/site/SiteProvider";
import { siteLinksSafe } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sprich Deutsch",
  description: "German practice A1–B2 with your own book: listen & repeat, grammar, videos, reading, writing, and voice conversations with Gemini.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The interface language comes from a cookie (set by the switcher, also for logged-out visitors).
  const fromCookie = (await cookies()).get(LANG_COOKIE)?.value;
  const lang: UILang = isUILang(fromCookie) ? fromCookie : "ar";
  // Which providers exist (never any keys) — known right away, so no banner pops in later.
  const cfg = serverConfig();
  const providers = { llm: cfg.llmProvider, tts: cfg.tts, stt: cfg.stt, storage: dbTarget().kind };
  // The owner's channel / explainer / playlist links, so the places that need them never show empty.
  const site = await siteLinksSafe();
  return (
    <html lang={lang} dir={dirOf(lang)} suppressHydrationWarning>
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
        <ProvidersProvider value={providers}>
          <UIProvider initialLang={lang} messages={DICT[lang]}>
            <MeProvider>
              <SiteProvider links={site}>
                <MotionProvider>
                  <AppShell>{children}</AppShell>
                </MotionProvider>
              </SiteProvider>
            </MeProvider>
          </UIProvider>
        </ProvidersProvider>
      </body>
    </html>
  );
}
