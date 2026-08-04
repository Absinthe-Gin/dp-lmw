import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import TopBar from "@/components/layout/TopBar";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
});

const publicSans = Public_Sans({
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
    <html lang="vi" className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <TopBar />
        {children}
      </body>
    </html>
  );
}
