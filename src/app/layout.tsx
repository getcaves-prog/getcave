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
    default: "Caves — Descubrí eventos cerca tuyo",
    template: "%s | Caves",
  },
  description:
    "Caves es la plataforma para descubrir eventos, planes y actividades cerca tuyo. Encontrá fiestas, shows, ferias y más en tu ciudad.",
  metadataBase: new URL("https://www.getcaves.com"),
  keywords: [
    "eventos",
    "planes",
    "actividades",
    "fiestas",
    "shows",
    "descubrir eventos",
    "agenda cultural",
    "que hacer",
    "caves",
  ],
  authors: [{ name: "Caves", url: "https://www.getcaves.com" }],
  creator: "Caves",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://www.getcaves.com",
    siteName: "Caves",
    title: "Caves — Descubrí eventos cerca tuyo",
    description:
      "Descubrí eventos, planes y actividades cerca tuyo. Fiestas, shows, ferias y más en tu ciudad.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Caves — Descubrí eventos cerca tuyo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Caves — Descubrí eventos cerca tuyo",
    description:
      "Descubrí eventos, planes y actividades cerca tuyo.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
