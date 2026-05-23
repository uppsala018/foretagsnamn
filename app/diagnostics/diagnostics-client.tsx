"use client";

import { useEffect, useState } from "react";

type HealthStatus = {
  app: "ok";
  stripeConfigured: boolean;
  firebaseConfigured: boolean;
  openrouterConfigured: boolean;
  hostupConfigured: boolean;
};

const STATUS_ROWS: Array<{
  key: keyof Omit<HealthStatus, "app">;
  label: string;
}> = [
  { key: "stripeConfigured", label: "Stripe konfigurerat" },
  { key: "firebaseConfigured", label: "Firebase konfigurerat" },
  { key: "openrouterConfigured", label: "OpenRouter konfigurerat" },
  { key: "hostupConfigured", label: "Domänplattform konfigurerad" },
];

export function DiagnosticsClient() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Health endpoint failed.");
        }

        return response.json() as Promise<HealthStatus>;
      })
      .then(setStatus)
      .catch(() => {
        setError("Kunde inte läsa diagnostikstatus.");
      });
  }, []);

  return (
    <section className="rounded-lg border border-[#d8d6c8] bg-white p-6 shadow-sm sm:p-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">
          Diagnostik
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Produktionsstatus</h1>
        <p className="max-w-2xl text-sm leading-6 text-[#58655e]">
          Denna sida visar endast om konfiguration verkar finnas, inte hemliga nycklar.
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {!status && !error ? (
        <p className="mt-6 text-sm text-[#58655e]">Läser status…</p>
      ) : null}

      {status ? (
        <div className="mt-6 grid gap-3">
          <div className="flex items-center justify-between rounded-md border border-[#d8d6c8] bg-[#f7f7f2] px-4 py-3">
            <span className="font-medium">App</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
              ok
            </span>
          </div>
          {STATUS_ROWS.map((row) => {
            const configured = status[row.key];

            return (
              <div key={row.key} className="flex items-center justify-between rounded-md border border-[#d8d6c8] bg-[#f7f7f2] px-4 py-3">
                <span className="font-medium">{row.label}</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  configured
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
                >
                  {configured ? "ja" : "nej"}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <a
        href="/"
        className="mt-6 inline-flex min-h-12 items-center rounded-md bg-[#173f32] px-5 font-semibold text-white transition hover:bg-[#0f2e25]"
      >
        Tillbaka till startsidan
      </a>
    </section>
  );
}
