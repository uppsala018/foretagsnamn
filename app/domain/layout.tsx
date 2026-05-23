import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "domain.mad.onl",
  description: "Domain registration and management.",
};

export default function DomainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
