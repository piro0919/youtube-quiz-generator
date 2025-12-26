import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SoundProvider } from "@/contexts/SoundContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YouTube Quiz Battle",
  description: "YouTubeの動画からクイズを生成して友達と対戦！",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://youtube-quiz-battle.kkweb.io"
  ),
  openGraph: {
    title: "YouTube Quiz Battle",
    description: "YouTubeの動画からクイズを生成して友達と対戦！",
    type: "website",
    locale: "ja_JP",
    siteName: "YouTube Quiz Battle",
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube Quiz Battle",
    description: "YouTubeの動画からクイズを生成して友達と対戦！",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <SoundProvider>{children}</SoundProvider>
      </body>
    </html>
  );
}
