import type { BrandRisk, NamecheckResult, ResultStatus } from "@/lib/namecheck/types";

const STATUS_LABELS: Record<ResultStatus, string> = {
  available: "Möjligen ledigt",
  taken: "Möjligen upptaget",
  uncertain: "Osäkert",
  error: "Fel",
  not_checked: "Ej kontrollerat",
};

const RISK_LABELS: Record<BrandRisk, string> = {
  low: "Låg risk",
  medium: "Medelrisk",
  high: "Hög risk",
  uncertain: "Osäker risk",
};

const STATUS_STYLES: Record<ResultStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-900",
  taken: "border-rose-200 bg-rose-50 text-rose-900",
  uncertain: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
  not_checked: "border-stone-200 bg-stone-100 text-stone-700",
};

const VERKSAMT_URL = "https://verksamt.se/bolagsverket/hjalp-att-valja-foretagsnamn";

function AiAssessmentDetails({ result }: { result: NamecheckResult }) {
  const analysis = result.metadata?.aiAnalysis;

  if (!analysis) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[result.status]}`}>
        {RISK_LABELS[analysis.overallRisk]}
      </span>

      {analysis.strengths.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Styrkor</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#3f4a44]">
            {analysis.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {analysis.warnings.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Varningar</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#3f4a44]">
            {analysis.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {analysis.suggestedAlternatives.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Alternativ</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {analysis.suggestedAlternatives.map((alternative) => (
              <span key={alternative} className="rounded-full border border-[#d8d6c8] bg-[#f7f7f2] px-3 py-1 text-xs text-[#3f4a44]">
                {alternative}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ResultCard({ result }: { result: NamecheckResult }) {
  return (
    <article className="rounded-lg border border-[#d8d6c8] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{result.label}</h3>
          <p className="mt-1 break-words text-sm text-[#58655e]">{result.value}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[result.status]}`}>
          {STATUS_LABELS[result.status]}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#3f4a44]">{result.summary}</p>
      {result.category === "ai_assessment" ? (
        <AiAssessmentDetails result={result} />
      ) : null}
      {result.checkLabel ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">
          {result.checkLabel}
        </p>
      ) : null}
      {result.metadata?.isPremiumName ? (
        <p className="mt-2 text-xs leading-5 text-[#6a746e]">
          Premiumdomän
          {result.metadata.premiumRegistrationPrice
            ? `, registrering ${result.metadata.premiumRegistrationPrice}`
            : ""}
          {result.metadata.premiumRenewalPrice
            ? `, förnyelse ${result.metadata.premiumRenewalPrice}`
            : ""}
        </p>
      ) : null}
      {result.metadata?.checkedUrl ? (
        <p className="mt-2 break-words text-xs leading-5 text-[#6a746e]">
          Kontrollerad URL: {result.metadata.checkedUrl}
        </p>
      ) : null}
      {result.metadata?.warning ? (
        <p className="mt-2 text-xs leading-5 text-amber-800">{result.metadata.warning}</p>
      ) : null}
      {result.metadata?.warnings && result.metadata.warnings.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Riskpunkter</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#3f4a44]">
            {result.metadata.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.metadata?.suggestions && result.metadata.suggestions.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">Förslag</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#3f4a44]">
            {result.metadata.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.details ? (
        <p className="mt-3 text-xs leading-5 text-[#6a746e]">{result.details}</p>
      ) : null}
      {result.category === "company_name" ? (
        <div className="mt-4 rounded-md border border-[#d8d6c8] bg-[#f7f7f2] p-3">
          <p className="text-sm font-semibold text-[#15201b]">Kontrollera även hos Verksamt/Bolagsverket</p>
          <p className="mt-1 text-xs leading-5 text-[#58655e]">
            För en officiell bedömning måste namnet prövas av Bolagsverket vid registrering.
          </p>
          <a
            href={VERKSAMT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-md bg-[#15201b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2c382f]"
          >
            Öppna Verksamt/Bolagsverket
          </a>
        </div>
      ) : null}
    </article>
  );
}
