import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Test Buddy — Turn notes into practice tests",
  description: "Upload notes or PDFs and generate quizzes instantly. AI feedback shows what to improve.",
  keywords: ["quiz generator", "study tools", "AI quiz", "practice tests", "study materials"],
  authors: [{ name: "Test Buddy" }],
  openGraph: {
    title: "Test Buddy",
    description: "Turn your notes into practice tests.",
    type: "website",
    images: [
      {
        url: "/assets/test-buddy-mascot.svg",
        width: 360,
        height: 360,
        alt: "Test Buddy mascot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Test Buddy",
    description: "Turn your notes into practice tests.",
    images: ["/assets/test-buddy-mascot.svg"],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.ico',
    apple: '/cartoon-avatar.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
