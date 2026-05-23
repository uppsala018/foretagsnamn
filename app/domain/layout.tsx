import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Syne } from "next/font/google";
import "../../styles/domain-globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--dm-font-inter",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--dm-font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Domain by mad.onl — Registrera din domän",
  description:
    "Sök och registrera .se, .com, .nu och 100+ domänändelser. Snabbt, enkelt och med transparenta priser.",
  alternates: {
    canonical: "https://domain.mad.onl",
  },
  openGraph: {
    siteName: "Domain by mad.onl",
  },
};

export default function DomainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Override root layout body background for the domain subdomain */}
      <style>{`body { background: #f8faf9 !important; }`}</style>
      <div className={`${inter.variable} ${syne.variable} dm-root`}>
        {children}
      </div>
    </>
  );
}
