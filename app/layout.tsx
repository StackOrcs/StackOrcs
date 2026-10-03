import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieNotice } from "@/components/cookie-notice";
import { PointerGlow } from "@/components/pointer-glow";
import { PwaRefreshGuard } from "@/components/pwa-refresh-guard";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stackorcs.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "StackOrcs",
  creator: "StackOrcs",
  publisher: "StackOrcs",
  category: "technology",
  title: {
    default: "StackOrcs",
    template: "%s | StackOrcs",
  },
  description:
    "StackOrcs designs and engineers fast digital products, intelligent automation, cloud platforms, and observable systems.",
  keywords: [
    "StackOrcs",
    "digital engineering",
    "software development",
    "cloud engineering",
    "AI automation",
    "observability",
  ],
  openGraph: {
    title: "StackOrcs — Digital Engineering, Built to Move",
    description:
      "Strategy, product engineering, cloud, AI, and operations—designed as one connected system.",
    type: "website",
    siteName: "StackOrcs",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "StackOrcs — Digital systems, built to move.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StackOrcs — Digital Engineering, Built to Move",
    description:
      "Strategy, product engineering, cloud, AI, and operations—designed as one connected system.",
    images: ["/og.png"],
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: "StackOrcs",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080807",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      style={{
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <body>
        <PwaRefreshGuard />
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <PointerGlow />
        <SiteHeader />
        {children}
        <SiteFooter />
        <CookieNotice />
      </body>
    </html>
  );
}
