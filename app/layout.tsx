/**
 * app/layout.tsx
 *
 * Root layout: wraps the app with HTML/body, loads DM Sans via next/font,
 * and applies global CSS. All pages render as children.
 */

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MathExtract",
  description: "Extract math problems from textbook pages and generate clean PDFs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
