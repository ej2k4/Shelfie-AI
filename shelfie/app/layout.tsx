import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shelfie — Live Local Inventory Near You",
  description:
    "Search real-time stock at nearby shops, reserve items instantly, and pick up in minutes. No delivery fees. Support your neighbourhood.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0b0f1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
