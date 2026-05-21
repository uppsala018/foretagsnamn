import type { Metadata } from "next";
import { DiagnosticsClient } from "./diagnostics-client";

export const metadata: Metadata = {
  title: "Diagnostik | Företagsnamn.app",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DiagnosticsPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-10 text-[#15201b]">
      <div className="mx-auto max-w-3xl">
        <DiagnosticsClient />
      </div>
    </main>
  );
}
