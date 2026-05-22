"use client";

import { FormEvent, useMemo, useState } from "react";
import { ReportView } from "@/components/namecheck/report-view";
import type { NamecheckReport, NamecheckResult } from "@/lib/namecheck/types";
import { MAX_QUERY_LENGTH } from "@/lib/namecheck/validation";

const DOMAIN_SUFFIXES = [
  ".se",
  ".nu",
  ".com",
  ".io",
  ".net",
  ".org",
  ".xyz",
  ".eu",
  ".online",
  ".store",
  ".blog",
];

type HostUpDomainResult = {
  name: string;
  available: boolean;
  price: number | null;
  currency: string | null;
  canRegister: boolean;
  reason: string | null;
  requirements: string[];
};

type HostUpApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is HostUpApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "yes", "1", "available"].includes(normalized)) {
      return true;
    }

    if (["false", "no", "0", "taken", "unavailable"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function readRequirements(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

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

function formatPrice(result: HostUpDomainResult): string {
  if (result.price === null) {
    return "Pris visas i nästa steg";
  }

  const currency = result.currency?.toUpperCase() === "SEK"
    ? "kr"
    : result.currency ?? "SEK";

  return `${result.price} ${currency} första året`;
}

function normalizeHostUpDomainResult(value: unknown, fallbackName: string): HostUpDomainResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const billing = isRecord(value.billing) ? value.billing : null;
  const pricing = isRecord(value.pricing) ? value.pricing : null;
  const actions = isRecord(value.actions) ? value.actions : null;
  const canRegisterAction = actions && isRecord(actions.canRegister) ? actions.canRegister : null;
  const name = readString(value.name)
    ?? readString(value.domain)
    ?? readString(value.fqdn)
    ?? fallbackName;
  const available = readBoolean(value.available)
    ?? readBoolean(value.isAvailable)
    ?? readBoolean(value.status)
    ?? false;
  const canRegister = readBoolean(value.canRegister)
    ?? readBoolean(value.can_register)
    ?? readBoolean(canRegisterAction?.allowed)
    ?? available;
  const price = readNumber(value.price)
    ?? readNumber(value.registrationPrice)
    ?? readNumber(value.registration_price)
    ?? readNumber(pricing?.price)
    ?? readNumber(billing?.amount);
  const currency = readString(value.currency)
    ?? readString(pricing?.currency)
    ?? readString(billing?.currency)
    ?? (price === null ? null : "SEK");

  return {
    name,
    available,
    price,
    currency,
    canRegister,
    reason: readString(value.reason)
      ?? readString(value.message)
      ?? readString(canRegisterAction?.reason)
      ?? (available ? null : "Domänen är inte tillgänglig."),
    requirements: readRequirements(value.requirements),
  };
}

function normalizeHostUpResponse(payload: unknown, requestedNames: string[]): HostUpDomainResult[] | null {
  if (!isRecord(payload)) {
    return null;
  }

  const rawResults = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.results)
      ? payload.results
      : null;

  if (!rawResults) {
    return null;
  }

  return rawResults
    .map((item, index) => normalizeHostUpDomainResult(item, requestedNames[index] ?? ""))
    .filter((item): item is HostUpDomainResult => item !== null);
}

function findDomainResult(results: HostUpDomainResult[], suffix: ".se" | ".com"): HostUpDomainResult | null {
  return results.find((result) => result.name.toLowerCase().endsWith(suffix)) ?? null;
}

function isCheapDomain(result: HostUpDomainResult): boolean {
  return result.available && result.price !== null && result.price <= 60;
}

function mergeHostUpDomainResult(result: NamecheckResult, hostupResult: HostUpDomainResult): NamecheckResult {
  const isSeDomain = result.category === "domain_se";

  return {
    ...result,
    value: hostupResult.name,
    status: hostupResult.available ? "available" : "taken",
    summary: hostupResult.available
      ? `${hostupResult.name} är ledig via HostUp.`
      : `${hostupResult.name} är upptagen enligt HostUp.`,
    details: hostupResult.available
      ? "Verifierad domändata från HostUp."
      : hostupResult.reason ?? "Verifierad domändata från HostUp.",
    checkLabel: "Indikativ kontroll",
    metadata: {
      ...result.metadata,
      domainPriceLabel: formatPrice(hostupResult),
      canRegister: hostupResult.canRegister,
      registryInfo: isSeDomain
        ? "Kräver telefonnummer, personnummer/org.nr och godkännande av registreringsvillkor"
        : undefined,
    } as NamecheckResult["metadata"],
  };
}

function mergeHostUpResultsIntoReport(
  report: NamecheckReport,
  hostupResults: HostUpDomainResult[],
): NamecheckReport {
  const seResult = findDomainResult(hostupResults, ".se");
  const comResult = findDomainResult(hostupResults, ".com");

  if (!seResult && !comResult) {
    return report;
  }

  return {
    ...report,
    results: report.results.map((result) => {
      if (result.category === "domain_se" && seResult) {
        return mergeHostUpDomainResult(result, seResult);
      }

      if (result.category === "domain_com" && comResult) {
        return mergeHostUpDomainResult(result, comResult);
      }

      return result;
    }),
  };
}

export function HomeClient() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<NamecheckReport | null>(null);
  const [domainResults, setDomainResults] = useState<HostUpDomainResult[]>([]);
  const [reportError, setReportError] = useState("");
  const [domainError, setDomainError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAllDomains, setShowAllDomains] = useState(false);

  const domainBase = useMemo(() => normalizeDomainBase(query), [query]);
  const domainNames = useMemo(
    () => domainBase ? DOMAIN_SUFFIXES.map((suffix) => `${domainBase}${suffix}`) : [],
    [domainBase],
  );
  const reportWithHostUpDomains = useMemo(
    () => report ? mergeHostUpResultsIntoReport(report, domainResults) : null,
    [report, domainResults],
  );
  const alternativeDomains = useMemo(
    () => domainResults.filter((result) => !result.name.endsWith(".se") && !result.name.endsWith(".com")),
    [domainResults],
  );
  const cheapDomains = useMemo(
    () => alternativeDomains.filter(isCheapDomain),
    [alternativeDomains],
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
    setShowAllDomains(false);

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
          success?: boolean;
          data?: unknown[];
          results?: unknown[];
          error?: string;
        };
        console.log("HostUp API-svar:", payload);
        const normalizedResults = normalizeHostUpResponse(payload, domainNames);

        if (domainResponse.value.ok && normalizedResults) {
          setDomainResults(normalizedResults);
        } else if (payload.error) {
          setDomainError(payload.error);
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

      {reportWithHostUpDomains ? <ReportView report={reportWithHostUpDomains} /> : null}

      {reportWithHostUpDomains && (alternativeDomains.length > 0 || domainError) ? (
        <section className="space-y-4 rounded-lg border border-[#d8d6c8] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">
                HostUp domäner
              </p>
              <h2 className="mt-1 text-2xl font-semibold">Fler domänalternativ</h2>
            </div>
            {alternativeDomains.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllDomains((current) => !current)}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#d8d6c8] bg-[#f7f7f2] px-4 text-sm font-semibold text-[#15201b] transition hover:bg-[#ecede3]"
              >
                {showAllDomains ? "Visa färre" : "Visa alla domäner"}
              </button>
            ) : null}
          </div>

          {domainError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {domainError}
            </p>
          ) : null}

          {cheapDomains.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {cheapDomains.map((result) => (
                <article
                  key={result.name}
                  className="min-w-56 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
                >
                  <p className="break-words font-semibold">{result.name}</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-800">{formatPrice(result)}</p>
                  <p className="mt-1 text-xs text-emerald-900">Ledig via HostUp</p>
                </article>
              ))}
            </div>
          ) : alternativeDomains.length > 0 ? (
            <p className="text-sm leading-6 text-[#58655e]">
              Inga lediga alternativ under 60 kr första året hittades i den här sökningen.
            </p>
          ) : null}

          {showAllDomains ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {alternativeDomains.map((result) => (
                <article
                  key={result.name}
                  className={`rounded-lg border p-4 ${
                    result.available
                      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                      : "border-rose-200 bg-rose-50 text-rose-950"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-sm font-semibold">{result.name}</p>
                    <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-xs font-semibold">
                      {result.available ? "Ledig" : "Upptagen"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#3f4a44]">
                    {result.available ? formatPrice(result) : result.reason ?? "Inte tillgänglig"}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-lg border border-[#d8d6c8] bg-white px-5 py-4 text-sm text-[#58655e] shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#c6c8ba] border-t-[#173f32]" />
          Hämtar AI-rapport, sociala kontroller och domäner...
        </div>
      ) : null}

    </>
  );
}
