import type { ReactNode } from "react";
import type { NamecheckReport } from "@/lib/namecheck/types";
import { ResultCard } from "./result-card";

type ReportViewProps = {
  report: NamecheckReport;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function ReportView({
  report,
  title = report.normalizedQuery,
  eyebrow = "Samlad rapport",
  action,
}: ReportViewProps) {
  return (
    <section className="space-y-5" aria-live="polite">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
          {title !== report.normalizedQuery ? (
            <p className="mt-1 text-sm text-[#58655e]">{report.normalizedQuery}</p>
          ) : null}
        </div>
        <p className="text-sm text-[#58655e]">Teknisk förhandskontroll</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {report.results.map((result) => (
          <ResultCard key={result.category} result={result} />
        ))}
      </div>

      {action}

      <p className="rounded-md border border-[#d8d6c8] bg-white px-4 py-3 text-sm text-[#58655e]">
        {report.disclaimer}
      </p>
    </section>
  );
}
