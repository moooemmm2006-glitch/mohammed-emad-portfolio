import type { Metadata, Viewport } from "next";
import { fontVars } from "@/lib/fonts";
import { siteUrl } from "@/lib/owner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Demo Studio", template: "%s" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={fontVars} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
