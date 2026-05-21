import type { Metadata } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foretagsnamn.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Företagsnamn.app | Kontrollera namn, domän och varumärkesrisk",
  description:
    "Gör en svensk förhandskoll av företagsnamn, domäner, sociala handles och namnrisken. Tydligt vad som är verifierat, indikativt och inte juridisk rådgivning.",
  alternates: {
    canonical: appUrl,
  },
  openGraph: {
    title: "Företagsnamn.app | Namn, domän och varumärke i ett slag",
    description:
      "Sök ett företagsnamn och få en samlad förhandskoll på domäner, sociala handles och namnrisken.",
    url: appUrl,
    siteName: "Företagsnamn.app",
    locale: "sv_SE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Företagsnamn.app | Kontrollera företagsnamn",
    description:
      "Förhandskolla företagsnamn, domäner, sociala handles och AI-baserad namnrisksummering.",
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
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
