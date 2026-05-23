import type { BrandRisk, NamecheckResult, ResultStatus } from "@/lib/namecheck/types";

const STATUS_LABELS: Record<ResultStatus, string> = {
  available:   "Möjligen ledigt",
  taken:       "Möjligen upptaget",
  uncertain:   "Osäkert",
  error:       "Fel",
  not_checked: "Ej kontrollerat",
};

const RISK_LABELS: Record<BrandRisk, string> = {
  low:       "Låg risk",
  medium:    "Medelrisk",
  high:      "Hög risk",
  uncertain: "Osäker risk",
};

const STATUS_COLORS: Record<ResultStatus, { bg: string; color: string; border: string }> = {
  available:   { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "rgba(34,197,94,0.2)" },
  taken:       { bg: "rgba(239,68,68,0.12)",  color: "#f87171", border: "rgba(239,68,68,0.2)" },
  uncertain:   { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.2)" },
  error:       { bg: "rgba(239,68,68,0.12)",  color: "#f87171", border: "rgba(239,68,68,0.2)" },
  not_checked: { bg: "rgba(74,85,104,0.15)",  color: "var(--text-muted)", border: "rgba(74,85,104,0.2)" },
};

const VERKSAMT_URL = "https://verksamt.se/bolagsverket/hjalp-att-valja-foretagsnamn";

type DomainMetadata = NonNullable<NamecheckResult["metadata"]> & {
  domainPriceLabel?: string;
  canRegister?: boolean;
  registryInfo?: string;
};

function StatusPill({ status, label }: { status: ResultStatus; label: string }) {
  const c = STATUS_COLORS[status];
  return (
    <span style={{
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function AiAssessmentDetails({ result }: { result: NamecheckResult }) {
  const analysis = result.metadata?.aiAnalysis;
  if (!analysis) return null;

  const riskC = STATUS_COLORS[
    analysis.overallRisk === "low" ? "available"
    : analysis.overallRisk === "high" ? "taken"
    : analysis.overallRisk === "medium" ? "uncertain"
    : "not_checked"
  ];

  return (
    <div style={{ marginTop: 14 }}>
      <span style={{
        background: riskC.bg, color: riskC.color,
        border: `1px solid ${riskC.border}`,
        borderRadius: 20, padding: "3px 10px",
        fontSize: 12, fontWeight: 500,
      }}>
        {RISK_LABELS[analysis.overallRisk]}
      </span>

      {analysis.strengths.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7ab3e8", marginBottom: 6 }}>Styrkor</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {analysis.strengths.map((s) => (
              <li key={s} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>✓ {s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {analysis.warnings.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7ab3e8", marginBottom: 6 }}>Varningar</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {analysis.warnings.map((w) => (
              <li key={w} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>⚠ {w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {analysis.suggestedAlternatives.length > 0 ? (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {analysis.suggestedAlternatives.map((alt) => (
            <span key={alt} style={{
              fontSize: 12, color: "#7ab3e8",
              border: "1px solid rgba(45,125,210,0.25)",
              borderRadius: 20, padding: "3px 10px",
            }}>
              {alt}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ResultCard({ result }: { result: NamecheckResult }) {
  const domainMetadata = result.metadata as DomainMetadata | undefined;
  const isHostUpDomainCard =
    (result.category === "domain_se" || result.category === "domain_com") &&
    Boolean(domainMetadata?.domainPriceLabel);
  const statusLabelText = isHostUpDomainCard
    ? result.status === "available" ? "Ledig" : "Upptagen"
    : STATUS_LABELS[result.status];

  return (
    <article style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{result.label}</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", wordBreak: "break-all" }}>{result.value}</p>
        </div>
        <StatusPill status={result.status} label={statusLabelText} />
      </div>

      <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{result.summary}</p>

      {isHostUpDomainCard ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>{domainMetadata?.domainPriceLabel}</p>
          {domainMetadata?.registryInfo ? (
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>{domainMetadata.registryInfo}</p>
          ) : null}
          {result.status === "available" ? (
            <a
              href={`https://domain.mad.onl?domain=${encodeURIComponent(result.value)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block", marginTop: 10,
                background: "var(--se-blue)", color: "#fff",
                textAlign: "center", padding: "10px 0",
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                textDecoration: "none",
                opacity: domainMetadata?.canRegister === false ? 0.5 : 1,
              }}
            >
              Köp nu
            </a>
          ) : null}
        </div>
      ) : null}

      {result.category === "ai_assessment" ? (
        <AiAssessmentDetails result={result} />
      ) : null}

      {result.metadata?.warnings && result.metadata.warnings.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7ab3e8", marginBottom: 6 }}>Riskpunkter</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {result.metadata.warnings.map((w) => (
              <li key={w} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>⚠ {w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.metadata?.suggestions && result.metadata.suggestions.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7ab3e8", marginBottom: 6 }}>Förslag</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {result.metadata.suggestions.map((s) => (
              <li key={s} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.metadata?.isPremiumName ? (
        <p style={{ marginTop: 8, fontSize: 11, color: "var(--amber)" }}>
          Premiumdomän
          {result.metadata.premiumRegistrationPrice ? `, registrering ${result.metadata.premiumRegistrationPrice}` : ""}
          {result.metadata.premiumRenewalPrice ? `, förnyelse ${result.metadata.premiumRenewalPrice}` : ""}
        </p>
      ) : null}

      {result.metadata?.warning ? (
        <p style={{ marginTop: 8, fontSize: 11, color: "var(--amber)" }}>{result.metadata.warning}</p>
      ) : null}

      {result.details ? (
        <p style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{result.details}</p>
      ) : null}

      {result.checkLabel ? (
        <p style={{ marginTop: 10, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
          {result.checkLabel}
        </p>
      ) : null}

      {result.category === "company_name" ? (
        <div style={{
          marginTop: 14,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 8, padding: "12px 14px",
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            Kontrollera även hos Verksamt/Bolagsverket
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
            För en officiell bedömning måste namnet prövas av Bolagsverket vid registrering.
          </p>
          <a
            href={VERKSAMT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: "var(--se-blue)", color: "#fff",
              fontSize: 12, fontWeight: 600,
              padding: "7px 14px", borderRadius: 7,
              textDecoration: "none",
            }}
          >
            Öppna Verksamt/Bolagsverket
          </a>
        </div>
      ) : null}
    </article>
  );
}
