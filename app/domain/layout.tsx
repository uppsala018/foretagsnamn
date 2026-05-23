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
  title: "domain.onl — Registrera domäner enkelt",
  description:
    "Sök och registrera domäner direkt — .se, .com, .nu och 100+ andra ändelser till konkurrenskraftiga priser.",
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
