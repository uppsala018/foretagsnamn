import type { CheckCategory, NamecheckReport, NamecheckResult } from "@/lib/namecheck/types";

const STATUS_LABELS: Record<NamecheckResult["status"], string> = {
  available: "Möjligen ledigt",
  taken: "Möjligen upptaget",
  uncertain: "Osäkert",
  error: "Fel",
  not_checked: "Ej kontrollerat",
};

const CATEGORY_GROUPS: Array<{
  title: string;
  categories: CheckCategory[];
}> = [
  {
    title: "Domäner",
    categories: ["domain_se", "domain_com"],
  },
  {
    title: "Sociala handles",
    categories: ["instagram", "tiktok"],
  },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function getResult(report: NamecheckReport, category: CheckCategory): NamecheckResult | undefined {
  return report.results.find((result) => result.category === category);
}

function ResultRow({ result }: { result: NamecheckResult }) {
  return (
    <article className="print-card rounded-md border border-[#d8d6c8] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">{result.label}</h3>
          <p className="mt-1 break-words text-sm text-[#58655e]">{result.value}</p>
        </div>
        <span className="rounded-full border border-[#d8d6c8] px-3 py-1 text-xs font-semibold text-[#3f4a44]">
          {STATUS_LABELS[result.status]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#3f4a44]">{result.summary}</p>
      {result.checkLabel ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">
          {result.checkLabel}
        </p>
      ) : null}
      {result.details ? (
        <p className="mt-2 text-xs leading-5 text-[#6a746e]">{result.details}</p>
      ) : null}
      {result.metadata?.checkedUrl ? (
        <p className="mt-2 break-words text-xs leading-5 text-[#6a746e]">
          Kontrollerad URL: {result.metadata.checkedUrl}
        </p>
      ) : null}
      {result.metadata?.warning ? (
        <p className="mt-2 text-xs leading-5 text-[#6a746e]">{result.metadata.warning}</p>
      ) : null}
      {result.metadata?.warnings && result.metadata.warnings.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Riskpunkter</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
            {result.metadata.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.metadata?.suggestions && result.metadata.suggestions.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Förslag</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
            {result.metadata.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function AiSection({ result }: { result?: NamecheckResult }) {
  const analysis = result?.metadata?.aiAnalysis;

  if (!result) {
    return null;
  }

  return (
    <section className="print-section space-y-3">
      <h2 className="text-xl font-semibold">AI-bedömning och risk</h2>
      <ResultRow result={result} />
      {analysis ? (
        <div className="print-card rounded-md border border-[#d8d6c8] bg-white p-4">
          <p className="text-sm font-semibold">Risknivå: {analysis.overallRisk}</p>
          <p className="mt-2 text-sm leading-6 text-[#3f4a44]">{analysis.summary}</p>
          {analysis.strengths.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Styrkor</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {analysis.strengths.map((strength) => (
                  <li key={strength}>{strength}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {analysis.warnings.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Varningar</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {analysis.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {analysis.suggestedAlternatives.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Alternativ</p>
              <p className="mt-2 text-sm leading-6">{analysis.suggestedAlternatives.join(", ")}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function PaidReportDocument({
  report,
  reportId,
}: {
  report: NamecheckReport;
  reportId: string;
}) {
  const companyName = getResult(report, "company_name");
  const aiResult = getResult(report, "ai_assessment");

  return (
    <article className="print-document hidden bg-white text-[#15201b] print:block">
      <header className="border-b border-[#d8d6c8] pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">Företagsnamn.app</p>
        <h1 className="mt-3 text-4xl font-semibold">Djupsökningsrapport</h1>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-[#58655e]">Namn</dt>
            <dd className="mt-1">{report.normalizedQuery}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#58655e]">Skapad</dt>
            <dd className="mt-1">{formatDate(report.generatedAt)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#58655e]">Rapport-ID</dt>
            <dd className="mt-1">{reportId}</dd>
          </div>
        </dl>
      </header>

      <div className="mt-6 space-y-7">
        {companyName ? (
          <section className="print-section space-y-3">
            <h2 className="text-xl font-semibold">Namnöversikt</h2>
            <ResultRow result={companyName} />
          </section>
        ) : null}

        {CATEGORY_GROUPS.map((group) => {
          const results = group.categories
            .map((category) => getResult(report, category))
            .filter((result): result is NamecheckResult => Boolean(result));

          if (results.length === 0) {
            return null;
          }

          return (
            <section key={group.title} className="print-section space-y-3">
              <h2 className="text-xl font-semibold">{group.title}</h2>
              <div className="grid gap-3">
                {results.map((result) => (
                  <ResultRow key={result.category} result={result} />
                ))}
              </div>
            </section>
          );
        })}

        <AiSection result={aiResult} />

        <section className="print-section rounded-md border border-[#d8d6c8] bg-white p-4">
          <h2 className="text-lg font-semibold">Disclaimer</h2>
          <p className="mt-2 text-sm leading-6 text-[#3f4a44]">{report.disclaimer}</p>
          <p className="mt-2 text-sm leading-6 text-[#3f4a44]">
            Rapporten är en teknisk förhandskontroll. Den påstår inte Bolagsverket- eller varumärkesverifiering.
          </p>
        </section>
      </div>
    </article>
  );
}
