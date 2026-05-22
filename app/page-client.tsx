"use client";

import { FormEvent, useMemo, useState } from "react";
import { ReportView } from "@/components/namecheck/report-view";
import type { NamecheckReport } from "@/lib/namecheck/types";
import { MAX_QUERY_LENGTH } from "@/lib/namecheck/validation";

const DOMAIN_SUFFIXES = [".se", ".nu", ".com", ".io", ".net", ".org"];
const REGISTRY_REQUIREMENTS = new Set(["se", "nu"]);

type HostUpDomainResult = {
  name: string;
  available: boolean;
  price: number | null;
  currency: string | null;
  canRegister: boolean;
  reason: string | null;
  requirements: string[];
};

function normalizeDomainBase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 63);
}

function tldFor(domain: string): string {
  return domain.split(".").pop()?.toLowerCase() ?? "";
}

function formatPrice(result: HostUpDomainResult): string {
  if (result.price === null) {
    return "Pris visas i nästa steg";
  }

  const currency = result.currency?.toUpperCase() === "SEK"
    ? "kr"
    : result.currency ?? "SEK";

  return `${result.price} ${currency} första året`;
}

export function HomeClient() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<NamecheckReport | null>(null);
  const [domainResults, setDomainResults] = useState<HostUpDomainResult[]>([]);
  const [reportError, setReportError] = useState("");
  const [domainError, setDomainError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const domainBase = useMemo(() => normalizeDomainBase(query), [query]);
  const domainNames = useMemo(
    () => domainBase ? DOMAIN_SUFFIXES.map((suffix) => `${domainBase}${suffix}`) : [],
    [domainBase],
  );
  const canSubmit = domainBase.length > 0 && !isLoading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery || !domainBase) {
      setReportError("Ange ett företagsnamn först.");
      setDomainError("");
      setReport(null);
      setDomainResults([]);
      return;
    }

    setIsLoading(true);
    setReportError("");
    setDomainError("");
    setReport(null);
    setDomainResults([]);

    const [reportResponse, domainResponse] = await Promise.allSettled([
      fetch("/api/namecheck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trimmedQuery }),
      }),
      fetch("/api/hostup/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ names: domainNames }),
      }),
    ]);

    if (reportResponse.status === "fulfilled") {
      try {
        const payload = await reportResponse.value.json();

        if (!reportResponse.value.ok) {
          setReportError(payload.error ?? "Kunde inte skapa AI-rapporten just nu.");
        } else {
          setReport(payload as NamecheckReport);
        }
      } catch {
        setReportError("Kunde inte läsa AI-rapporten just nu.");
      }
    } else {
      setReportError("Kunde inte skapa AI-rapporten just nu.");
    }

    if (domainResponse.status === "fulfilled") {
      try {
        const payload = await domainResponse.value.json() as {
          results?: HostUpDomainResult[];
          error?: string;
        };

        if (!domainResponse.value.ok || !Array.isArray(payload.results)) {
          setDomainError(payload.error ?? "Kunde inte kontrollera domäner just nu.");
        } else {
          setDomainResults(payload.results);
        }
      } catch {
        setDomainError("Kunde inte läsa domänresultaten just nu.");
      }
    } else {
      setDomainError("Kunde inte kontrollera domäner just nu.");
    }

    setIsLoading(false);
  }

  return (
    <>
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="space-y-7">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">
              Indikativ kontroll
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              Namn, domän och varumärke i ett slag
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#4f5c54]">
              Sök ett företagsnamn och få en samlad koll på AI-risk, sociala handles och lediga domäner via HostUp.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-lg border border-[#d8d6c8] bg-white p-3 shadow-sm sm:flex-row"
          >
            <label className="sr-only" htmlFor="name-search">
              Företagsnamn
            </label>
            <input
              id="name-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={MAX_QUERY_LENGTH}
              placeholder="Exempel: Gröna Verkstan"
              className="min-h-14 flex-1 rounded-md border border-transparent bg-[#f7f7f2] px-4 text-base outline-none transition focus:border-[#2f6b4f] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-[#173f32] px-6 font-semibold text-white transition hover:bg-[#0f2e25] disabled:cursor-not-allowed disabled:bg-[#9aa49e]"
            >
              {isLoading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : null}
              {isLoading ? "Kontrollerar..." : "Sök domäner"}
            </button>
          </form>

          {domainNames.length > 0 ? (
            <p className="text-sm text-[#58655e]">
              Söker: {domainNames.join(", ")}
            </p>
          ) : null}

          {reportError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {reportError}
            </p>
          ) : null}
        </div>

        <aside className="rounded-lg border border-[#d8d6c8] bg-[#ecede3] p-6">
          <p className="text-sm font-semibold text-[#54665c]">Tydlig förhandskoll</p>
          <p className="mt-3 text-2xl font-semibold">AI-rapporten visas först, sedan domäner med pris och köpknapp.</p>
          <p className="mt-4 text-sm leading-6 text-[#58655e]">
            .se och .nu kan kräva extra uppgifter som telefon, personnummer eller organisationsnummer.
          </p>
        </aside>
      </section>

      {report ? <ReportView report={report} /> : null}

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-lg border border-[#d8d6c8] bg-white px-5 py-4 text-sm text-[#58655e] shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#c6c8ba] border-t-[#173f32]" />
          Hämtar AI-rapport, sociala kontroller och domäner...
        </div>
      ) : null}

      {(domainResults.length > 0 || domainError) ? (
        <section className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">
              HostUp domänsökning
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Tillgängliga domäner för ditt företagsnamn
            </h2>
          </div>

          {domainError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {domainError}
            </p>
          ) : null}

          {domainResults.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {domainResults.map((result) => {
                const tld = tldFor(result.name);
                const needsRegistryRequirements = REGISTRY_REQUIREMENTS.has(tld);

                return (
                  <article
                    key={result.name}
                    className={`rounded-lg border p-5 shadow-sm ${
                      result.available
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="break-words text-xl font-semibold">{result.name}</h3>
                        <p className={`mt-3 text-3xl font-semibold ${
                          result.available ? "text-emerald-800" : "text-rose-800"
                        }`}
                        >
                          {result.available ? "Ledig!" : "Upptagen"}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        result.available
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-rose-100 text-rose-900"
                      }`}
                      >
                        .{tld}
                      </span>
                    </div>

                    {result.available ? (
                      <>
                        <p className="mt-4 text-2xl font-semibold text-[#15201b]">
                          {formatPrice(result)}
                        </p>
                        {needsRegistryRequirements ? (
                          <p className="mt-3 text-xs leading-5 text-[#58655e]">
                            Kräver telefonnummer, personnummer/org.nr och godkännande av registreringsvillkor
                          </p>
                        ) : null}
                        {result.requirements.length > 0 ? (
                          <ul className="mt-3 space-y-1 text-xs leading-5 text-[#58655e]">
                            {result.requirements.map((requirement) => (
                              <li key={requirement}>{requirement}</li>
                            ))}
                          </ul>
                        ) : null}
                        {/* TODO: Köp-flöde (registrering + nameservers via HostUp) */}
                        <button
                          type="button"
                          disabled={!result.canRegister}
                          className="mt-5 min-h-12 w-full rounded-md bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-[#9aa49e]"
                        >
                          Köp nu
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="mt-4 text-sm leading-6 text-[#5f2a31]">
                          {result.reason ?? "Domänen är inte tillgänglig."}
                        </p>
                        {needsRegistryRequirements ? (
                          <p className="mt-3 text-xs leading-5 text-[#6d4c50]">
                            Kräver telefonnummer, personnummer/org.nr och godkännande av registreringsvillkor
                          </p>
                        ) : null}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
