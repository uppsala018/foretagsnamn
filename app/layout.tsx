import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif-display",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foretagsnamn.mad.onl";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Företagsnamn.app | Rätt namn från start",
  description:
    "Förhandskolla ditt företagsnamn mot domäner, sociala handles och varumärkesregister. AI-driven namnkoll för svenska bolag.",
  alternates: {
    canonical: appUrl,
  },
  openGraph: {
    title: "Företagsnamn.app | Rätt namn från start",
    description:
      "Förhandskolla ditt företagsnamn mot domäner, sociala handles och varumärkesregister. AI-driven namnkoll för svenska bolag.",
    url: appUrl,
    siteName: "Företagsnamn.app",
    locale: "sv_SE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Företagsnamn.app | Rätt namn från start",
    description:
      "Förhandskolla ditt företagsnamn mot domäner, sociala handles och varumärkesregister. AI-driven namnkoll för svenska bolag.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
      <body>{children}</body>
    </html>
  );
}
