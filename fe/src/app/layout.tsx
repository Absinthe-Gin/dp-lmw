import type { Metadata } from "next";
import { Merriweather, Open_Sans, IBM_Plex_Mono } from "next/font/google";
import TopBar from "@/components/layout/TopBar";
import BackgroundBubbles from "@/components/layout/BackgroundBubbles";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialogProvider";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-display",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "DP LMW",
  description: "Lưu trữ ảnh, video kỷ niệm và gộp album tự động",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${merriweather.variable} ${openSans.variable} ${plexMono.variable}`}>
      <head>
        {/* Blocking, runs before hydration: applies a previously-saved "dark"
            choice immediately so a returning visitor doesn't see a light
            flash. Does nothing (default stays light) when nothing was saved. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <BackgroundBubbles />
        <ConfirmDialogProvider>
          <TopBar />
          {children}
          <ScrollToTopButton />
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
