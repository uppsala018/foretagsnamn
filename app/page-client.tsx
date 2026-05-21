"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ReportView } from "@/components/namecheck/report-view";
import type { NamecheckReport } from "@/lib/namecheck/types";
import { MAX_QUERY_LENGTH } from "@/lib/namecheck/validation";

export function HomeClient() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<NamecheckReport | null>(null);
  const [error, setError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  const canSubmit = useMemo(() => query.trim().length > 0 && !isLoading, [query, isLoading]);
  const checkoutDisabled = !stripeConfigured || isCheckoutLoading;

  useEffect(() => {
    let isMounted = true;

    fetch("/api/checkout/deep-search")
      .then((response) => response.json())
      .then((payload) => {
        if (isMounted) {
          setStripeConfigured(Boolean(payload.configured));
        }
      })
      .catch(() => {
        if (isMounted) {
          setStripeConfigured(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError("Ange ett namn först.");
      return;
    }

    setIsLoading(true);
    setError("");
    setCheckoutError("");

    try {
      const response = await fetch("/api/namecheck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trimmedQuery }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Kunde inte kontrollera namnet.");
        setReport(null);
        return;
      }

      setReport(payload);
    } catch {
      setError("Något gick fel. Försök igen.");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCheckout() {
    const checkoutQuery = report?.normalizedQuery ?? query.trim();

    if (!checkoutQuery || checkoutDisabled) {
      return;
    }

    setIsCheckoutLoading(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/checkout/deep-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: checkoutQuery }),
      });
      const payload = await response.json();

      if (!response.ok || typeof payload.url !== "string") {
        setCheckoutError(payload.error ?? "Kunde inte starta betalning just nu.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setCheckoutError("Kunde inte starta betalning just nu.");
    } finally {
      setIsCheckoutLoading(false);
    }
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
              Sök ett företagsnamn och få en samlad koll på domäner, sociala handles och namnrisken.
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
              className="min-h-14 rounded-md bg-[#173f32] px-6 font-semibold text-white transition hover:bg-[#0f2e25] disabled:cursor-not-allowed disabled:bg-[#9aa49e]"
            >
              {isLoading ? "Kontrollerar..." : "Gör gratis förhandskoll"}
            </button>
          </form>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <aside className="rounded-lg border border-[#d8d6c8] bg-[#ecede3] p-6">
          <p className="text-sm font-semibold text-[#54665c]">Tydlig förhandskoll</p>
          <p className="mt-3 text-2xl font-semibold">Verifierat där det går, indikativt där API saknas.</p>
          <p className="mt-4 text-sm leading-6 text-[#58655e]">
            Djupsökning kostar 49 kr, sparas efter verifierad Stripe-betalning och kan skrivas ut som PDF.
          </p>
        </aside>
      </section>

      {report ? (
        <ReportView
          report={report}
          action={
            <div className="rounded-lg border border-[#d8d6c8] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Djupsökning</h3>
                  <p className="mt-1 text-sm leading-6 text-[#58655e]">
                    Köp djupsökning för 49 kr och få en sparad rapport som kan skrivas ut eller sparas som PDF.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutDisabled}
                  className="min-h-12 rounded-md bg-[#173f32] px-5 font-semibold text-white transition hover:bg-[#0f2e25] disabled:cursor-not-allowed disabled:bg-[#9aa49e]"
                >
                  {!stripeConfigured
                    ? "Betalning inte konfigurerad ännu"
                    : isCheckoutLoading
                      ? "Startar betalning..."
                      : "Köp djupsökning – 49 kr"}
                </button>
              </div>
              {checkoutError ? (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {checkoutError}
                </p>
              ) : null}
            </div>
          }
        />
      ) : null}
    </>
  );
}
