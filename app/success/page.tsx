"use client";

import { useEffect, useMemo, useState } from "react";
import { PaidReportDocument } from "@/components/namecheck/paid-report-document";
import { ReportView } from "@/components/namecheck/report-view";
import type { NamecheckReport } from "@/lib/namecheck/types";

type PaidReportResponse = {
  report?: NamecheckReport;
  sessionId?: string;
  error?: string;
};

type SuccessState =
  | "missing_session"
  | "verifying"
  | "creating_report"
  | "ready"
  | "invalid_payment"
  | "report_error";

function shortReportId(sessionId: string): string {
  return sessionId.slice(0, 12);
}

export default function SuccessPage() {
  const [state, setState] = useState<SuccessState>("verifying");
  const [report, setReport] = useState<NamecheckReport | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const reportId = useMemo(() => shortReportId(sessionId), [sessionId]);

  useEffect(() => {
    const currentSessionId = new URLSearchParams(window.location.search).get("session_id");

    if (!currentSessionId) {
      setState("missing_session");
      return;
    }

    const verifiedSessionId = currentSessionId;
    setSessionId(verifiedSessionId);

    const reportTimer = window.setTimeout(() => {
      setState((currentState) => currentState === "verifying" ? "creating_report" : currentState);
    }, 800);

    async function loadPaidReport() {
      try {
        setState("verifying");
        const response = await fetch("/api/reports/paid", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: verifiedSessionId }),
        });
        const payload = await response.json() as PaidReportResponse;

        if (!response.ok || !payload.report) {
          setErrorMessage(payload.error ?? "Kunde inte skapa rapporten.");
          setState(response.status === 403 ? "invalid_payment" : "report_error");
          return;
        }

        setReport(payload.report);
        setSessionId(payload.sessionId ?? verifiedSessionId);
        setState("ready");
      } catch {
        setErrorMessage("Kunde inte skapa rapporten.");
        setState("report_error");
      } finally {
        window.clearTimeout(reportTimer);
      }
    }

    void loadPaidReport();

    return () => {
      window.clearTimeout(reportTimer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-10 text-[#15201b] print:bg-white print:px-0 print:py-0">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 print:block print:max-w-none">
        <nav className="no-print flex items-center justify-between">
          <a href="/" className="text-lg font-semibold tracking-normal">Företagsnamn by mad.onl</a>
          <span className="rounded-full border border-[#d8d6c8] bg-white px-4 py-2 text-sm font-medium text-[#475149]">
            Djupsökning 49 kr
          </span>
        </nav>

        {state === "missing_session" ? (
          <StatusPanel title="Ingen betalningssession hittades." />
        ) : null}

        {state === "verifying" ? (
          <StatusPanel title="Verifierar betalning…" />
        ) : null}

        {state === "creating_report" ? (
          <StatusPanel title="Skapar rapport…" />
        ) : null}

        {state === "invalid_payment" ? (
          <StatusPanel title="Betalningen kunde inte verifieras." message={errorMessage} />
        ) : null}

        {state === "report_error" ? (
          <StatusPanel title="Kunde inte skapa rapporten." message={errorMessage} />
        ) : null}

        {state === "ready" && report ? (
          <>
            <div className="no-print space-y-5">
              <div className="rounded-lg border border-[#d8d6c8] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">
                      Rapport-ID {reportId}
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold">Betalning mottagen</h1>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="min-h-12 rounded-md bg-[#173f32] px-5 font-semibold text-white transition hover:bg-[#0f2e25]"
                    >
                      Skriv ut / spara som PDF
                    </button>
                    <a
                      href="/"
                      className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#d8d6c8] bg-white px-5 font-semibold text-[#173f32] transition hover:bg-[#f7f7f2]"
                    >
                      Tillbaka till startsidan
                    </a>
                  </div>
                </div>
              </div>

              <ReportView report={report} title="Djupsökningsrapport" eyebrow="Betalning mottagen" />
            </div>

            <PaidReportDocument report={report} reportId={reportId} />
          </>
        ) : null}
      </section>
    </main>
  );
}

function StatusPanel({ title, message }: { title: string; message?: string }) {
  return (
    <section className="no-print rounded-lg border border-[#d8d6c8] bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-7 text-[#4f5c54]">
        {message || "Full rapport visas bara efter att Stripe-sessionen har verifierats som betald."}
      </p>
      <a
        href="/"
        className="mt-6 inline-flex min-h-12 w-fit items-center rounded-md bg-[#173f32] px-5 font-semibold text-white transition hover:bg-[#0f2e25]"
      >
        Tillbaka till startsidan
      </a>
    </section>
  );
}
