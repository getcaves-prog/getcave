import type { Metadata, Viewport } from "next";
import { Inter, Space_Mono, Pinyon_Script } from "next/font/google";
import { GrainOverlay } from "@/shared/components/layout/grain-overlay";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceMono = Space_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-space-mono",
});

const pinyonScript = Pinyon_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pinyon-script",
});

export const metadata: Metadata = {
  title: {
    default: "Caves",
    template: "%s | Caves",
  },
  description: "Discover what's happening around you",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://joincaves.com"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${spaceMono.variable} ${pinyonScript.variable}`}>
      <body className="bg-cave-black text-white font-[family-name:var(--font-inter)] antialiased">
        <GrainOverlay />
        {children}
      </body>
    </html>
  );
}
