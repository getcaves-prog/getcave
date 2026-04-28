import type { Metadata, Viewport } from "next";
import { Inter, Space_Mono, Pinyon_Script } from "next/font/google";
import { TermsConsentGate } from "@/features/auth/components/terms-consent-gate";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Caves",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${spaceMono.variable} ${pinyonScript.variable} min-h-dvh`}>
      <body className="min-h-dvh bg-cave-black text-white font-[family-name:var(--font-inter)] antialiased overscroll-none">
        {children}
        <TermsConsentGate />
      </body>
    </html>
  );
}
