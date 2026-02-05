import type { Metadata } from "next";
import { Inter, Manrope, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ClerkApiProvider } from "@/components/ClerkApiProvider";

// Prevent static generation - app requires Clerk auth at runtime
export const dynamic = "force-dynamic";

// Required for Cloudflare Pages deployment
export const runtime = "edge";

// Fonts loaded at build time and self-hosted by Next.js (no FOUT)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Luca - Marketing Analytics Platform",
  description: "AI-powered marketing analytics for Saudi e-commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Material Symbols still loaded via CDN (icon font, not text) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className={`${inter.variable} ${manrope.variable} ${ibmPlexArabic.variable} font-sans antialiased selection:bg-primary/20`}>
        <ClerkApiProvider>
          {children}
        </ClerkApiProvider>
      </body>
    </html>
  );
}
