"use client";

import { FormEvent, useMemo, useState } from "react";
import type { NamecheckReport, NamecheckResult, BrandRisk } from "@/lib/namecheck/types";
import { MAX_QUERY_LENGTH } from "@/lib/namecheck/validation";

const DOMAIN_SUFFIXES = [
  ".se", ".nu", ".com", ".io", ".net", ".org", ".xyz", ".eu", ".online", ".store", ".blog",
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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const n = value.trim().toLowerCase();
    if (["true", "yes", "1", "available"].includes(n)) return true;
    if (["false", "no", "0", "taken", "unavailable"].includes(n)) return false;
  }
  return null;
}

function readRequirements(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeDomainBase(value: string): string {
  return value.trim().toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "").slice(0, 63);
}

function formatPrice(result: HostUpDomainResult): string {
  if (result.price === null) return "Pris visas i nästa steg";
  const currency = result.currency?.toUpperCase() === "SEK" ? "kr" : result.currency ?? "SEK";
  return `${result.price} ${currency}/år`;
}

function normalizeHostUpDomainResult(value: unknown, fallbackName: string): HostUpDomainResult | null {
  if (!isRecord(value)) return null;
  const billing = isRecord(value.billing) ? value.billing : null;
  const pricing = isRecord(value.pricing) ? value.pricing : null;
  const actions = isRecord(value.actions) ? value.actions : null;
  const canRegisterAction = actions && isRecord(actions.canRegister) ? actions.canRegister : null;
  const name = readString(value.name) ?? readString(value.domain) ?? readString(value.fqdn) ?? fallbackName;
  const available = readBoolean(value.available) ?? readBoolean(value.isAvailable) ?? readBoolean(value.status) ?? false;
  const canRegister = readBoolean(value.canRegister) ?? readBoolean(value.can_register) ?? readBoolean(canRegisterAction?.allowed) ?? available;
  const price = readNumber(value.price) ?? readNumber(value.registrationPrice) ?? readNumber(value.registration_price) ?? readNumber(pricing?.price) ?? readNumber(billing?.amount);
  const currency = readString(value.currency) ?? readString(pricing?.currency) ?? readString(billing?.currency) ?? (price === null ? null : "SEK");
  return {
    name, available, price, currency, canRegister,
    reason: readString(value.reason) ?? readString(value.message) ?? readString(canRegisterAction?.reason) ?? (available ? null : "Domänen är inte tillgänglig."),
    requirements: readRequirements(value.requirements),
  };
}

function normalizeHostUpResponse(payload: unknown, requestedNames: string[]): HostUpDomainResult[] | null {
  if (!isRecord(payload)) return null;
  const rawResults = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.results) ? payload.results : null;
  if (!rawResults) return null;
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
    summary: hostupResult.available ? `${hostupResult.name} är ledig.` : `${hostupResult.name} är upptagen.`,
    details: hostupResult.available ? "Verifierad domändata." : hostupResult.reason ?? "Verifierad domändata.",
    checkLabel: "Indikativ kontroll",
    metadata: {
      ...result.metadata,
      domainPriceLabel: formatPrice(hostupResult),
      canRegister: hostupResult.canRegister,
      registryInfo: isSeDomain ? "Kräver telefonnummer, personnummer/org.nr och godkännande av registreringsvillkor" : undefined,
    } as NamecheckResult["metadata"],
  };
}

function mergeHostUpResultsIntoReport(report: NamecheckReport, hostupResults: HostUpDomainResult[]): NamecheckReport {
  const seResult = findDomainResult(hostupResults, ".se");
  const comResult = findDomainResult(hostupResults, ".com");
  if (!seResult && !comResult) return report;
  return {
    ...report,
    results: report.results.map((result) => {
      if (result.category === "domain_se" && seResult) return mergeHostUpDomainResult(result, seResult);
      if (result.category === "domain_com" && comResult) return mergeHostUpDomainResult(result, comResult);
      return result;
    }),
  };
}

function getOverallRisk(report: NamecheckReport): BrandRisk | null {
  const ai = report.results.find((r) => r.category === "ai_assessment");
  return ai?.metadata?.aiAnalysis?.overallRisk ?? ai?.metadata?.riskLevel ?? null;
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: BrandRisk | null }) {
  const cfg = {
    low:       { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "rgba(34,197,94,0.2)",  label: "Låg risk" },
    medium:    { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.2)", label: "Medel risk" },
    high:      { bg: "rgba(239,68,68,0.12)",  color: "#f87171", border: "rgba(239,68,68,0.2)",  label: "Hög risk" },
    uncertain: { bg: "rgba(139,155,191,0.12)", color: "#8b9bbf", border: "rgba(139,155,191,0.2)", label: "Osäker risk" },
  } as const;

  const c = risk ? cfg[risk] : cfg.uncertain;

  return (
    <span style={{
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 500,
    }}>
      {c.label}
    </span>
  );
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function statusDot(available: boolean | null): { dot: string; label: string; color: string } {
  if (available === true)  return { dot: "●", label: "Ledigt",  color: "var(--green)" };
  if (available === false) return { dot: "●", label: "Taget",   color: "var(--red)" };
  return { dot: "●", label: "Okänt", color: "var(--text-muted)" };
}

function resultStatusAvailable(status: NamecheckResult["status"]): boolean | null {
  if (status === "available") return true;
  if (status === "taken")     return false;
  return null;
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px 20px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
      {children}
    </p>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({ label, value, available, last }: { label: string; value: string; available: boolean | null; last?: boolean }) {
  const color = available === true ? "#4ade80" : available === false ? "#f87171" : "var(--text-muted)";
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: 13, color }}>{value}</span>
    </div>
  );
}

// ─── Namnkontroll card ────────────────────────────────────────────────────────

function NamnkontrollCard({ report }: { report: NamecheckReport }) {
  const result = report.results.find((r) => r.category === "company_name");
  if (!result) return null;

  const warnings = result.metadata?.warnings ?? [];
  const rows: { label: string; value: string; available: boolean | null }[] = [];

  rows.push({
    label: "Bolagsverket (indikativt)",
    value: result.status === "available" ? "OK" : result.status === "taken" ? "Taget" : "Osäkert",
    available: resultStatusAvailable(result.status),
  });

  if (warnings.length > 0) {
    warnings.slice(0, 3).forEach((w) => {
      rows.push({ label: w.slice(0, 30), value: "⚠ Risk", available: false });
    });
  } else {
    rows.push({ label: "Namnformat", value: result.status === "available" ? "OK" : "Kontrollera", available: resultStatusAvailable(result.status) });
    rows.push({ label: "Särskiljningsförmåga", value: result.status === "available" ? "OK" : "Kontrollera", available: resultStatusAvailable(result.status) });
  }

  return (
    <Card>
      <CardLabel>Namnkontroll</CardLabel>
      {rows.map((row, i) => (
        <Row key={i} label={row.label} value={row.value} available={row.available} last={i === rows.length - 1} />
      ))}
      {result.summary ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>{result.summary}</p>
      ) : null}
    </Card>
  );
}

// ─── Sociala medier card ──────────────────────────────────────────────────────

const SOCIAL_ROWS: { label: string; key: "instagram" | "tiktok" | null }[] = [
  { label: "Instagram", key: "instagram" },
  { label: "TikTok",    key: "tiktok" },
  { label: "X · Twitter", key: null },
  { label: "YouTube",   key: null },
];

function SocialCard({ report }: { report: NamecheckReport }) {
  const igResult  = report.results.find((r) => r.category === "instagram");
  const ttResult  = report.results.find((r) => r.category === "tiktok");

  return (
    <Card>
      <CardLabel>Sociala medier</CardLabel>
      {SOCIAL_ROWS.map((row, i) => {
        const result = row.key === "instagram" ? igResult : row.key === "tiktok" ? ttResult : null;
        const available = result ? resultStatusAvailable(result.status) : null;
        const value = result
          ? result.status === "available" ? "Möjligen ledigt" : result.status === "taken" ? "Möjligen taget" : "Osäkert"
          : "Ej kontrollerat";
        return (
          <Row key={row.label} label={row.label} value={value} available={available} last={i === SOCIAL_ROWS.length - 1} />
        );
      })}
    </Card>
  );
}

// ─── Domains card ─────────────────────────────────────────────────────────────

function DomainsCard({ domainResults, showAll, onToggle, domainError }: {
  domainResults: HostUpDomainResult[];
  showAll: boolean;
  onToggle: () => void;
  domainError: string;
}) {
  const visible = showAll ? domainResults : domainResults.slice(0, 6);

  return (
    <div id="domains" style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px 20px",
    }}>
      <CardLabel>Domäner</CardLabel>
      {domainError ? (
        <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 8 }}>{domainError}</p>
      ) : null}
      {visible.map((result, i) => {
        const ds = statusDot(result.available);
        return (
          <div key={result.name} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 0",
            borderBottom: i === visible.length - 1 ? "none" : "1px solid var(--border)",
          }}>
            <span style={{ fontWeight: 500, fontSize: 14, color: "var(--text-primary)", minWidth: 120 }}>{result.name}</span>
            <span style={{ color: ds.color, fontSize: 13, flex: 1, paddingLeft: 12 }}>{ds.dot} {ds.label}</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", paddingRight: 12 }}>
              {result.available ? formatPrice(result) : ""}
            </span>
            {result.available ? (
              <a
                href={`https://domain.mad.onl?domain=${encodeURIComponent(result.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "var(--se-blue)", color: "#fff",
                  fontSize: 12, fontWeight: 600,
                  padding: "5px 12px", borderRadius: 6,
                  textDecoration: "none", whiteSpace: "nowrap",
                }}
              >
                Registrera
              </a>
            ) : (
              <span style={{
                background: "var(--text-muted)", color: "#fff",
                fontSize: 12, fontWeight: 600,
                padding: "5px 12px", borderRadius: 6, cursor: "default",
              }}>
                Taget
              </span>
            )}
          </div>
        );
      })}
      {domainResults.length > 6 ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <button
            type="button"
            onClick={onToggle}
            style={{ fontSize: 12, color: "#7ab3e8", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {showAll ? "Visa färre" : `Visa alla ${domainResults.length} domänändelser`}
          </button>
          <a
            href="https://domain.mad.onl"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#7ab3e8", textDecoration: "none" }}
          >
            Fler domänändelser på Domain by mad.onl →
          </a>
        </div>
      ) : (
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <a href="https://domain.mad.onl" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#7ab3e8", textDecoration: "none" }}>
            Fler domänändelser på Domain by mad.onl →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── AI card ──────────────────────────────────────────────────────────────────

function AiCard({ report }: { report: NamecheckReport }) {
  const result = report.results.find((r) => r.category === "ai_assessment");
  if (!result) return null;

  const analysis = result.metadata?.aiAnalysis;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(29,86,160,0.1) 0%, rgba(17,24,39,1) 60%)",
      border: "1px solid rgba(45,125,210,0.2)",
      borderRadius: 12, padding: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--se-yellow)", display: "inline-block" }} />
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7ab3e8" }}>
          AI-bedömning (gratis förhandskoll)
        </span>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text-secondary)" }}>
        {analysis?.summary ?? result.summary}
      </p>
      {analysis?.strengths && analysis.strengths.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7ab3e8", marginBottom: 6 }}>Styrkor</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {analysis.strengths.map((s) => (
              <li key={s} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: 12, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "var(--green)" }}>✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis?.warnings && analysis.warnings.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7ab3e8", marginBottom: 6 }}>Risker</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {analysis.warnings.map((w) => (
              <li key={w} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: 12, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "var(--amber)" }}>⚠</span>{w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis?.suggestedAlternatives && analysis.suggestedAlternatives.length > 0 ? (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {analysis.suggestedAlternatives.map((alt) => (
            <span key={alt} style={{
              fontSize: 12, color: "#7ab3e8",
              border: "1px solid rgba(45,125,210,0.25)",
              borderRadius: 20, padding: "3px 10px",
            }}>{alt}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Unlock bar ───────────────────────────────────────────────────────────────

function UnlockBar({ query }: { query: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!query.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/deep-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1.5px solid var(--border-accent)",
      borderRadius: 12, padding: "18px 22px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
    }}>
      <div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Fullständig djupsökning</p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Varumärkesregister · PDF-rapport · 30 dagars bevakning · 10 namnalternativ</p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          background: "var(--se-yellow)", color: "#0a0e1a",
          fontWeight: 700, padding: "12px 28px", borderRadius: 9,
          border: "none", cursor: loading ? "not-allowed" : "pointer",
          fontSize: 15, opacity: loading ? 0.7 : 1, flexShrink: 0,
        }}
      >
        {loading ? "Laddar..." : "Köp för 49 kr"}
      </button>
    </div>
  );
}

// ─── Results section ──────────────────────────────────────────────────────────

function ResultsSection({ report, domainResults, showAll, onToggle, domainError, query }: {
  report: NamecheckReport;
  domainResults: HostUpDomainResult[];
  showAll: boolean;
  onToggle: () => void;
  domainError: string;
  query: string;
}) {
  const risk = getOverallRisk(report);

  return (
    <section aria-live="polite" style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 60px" }}>
      {/* Name bar */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10, marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>{report.normalizedQuery}</span>
          <RiskBadge risk={risk} />
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Förhandskoll · Ej juridiskt bindande</span>
      </div>

      {/* 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <NamnkontrollCard report={report} />
        <SocialCard report={report} />
      </div>

      {/* Domains */}
      <div style={{ marginBottom: 14 }}>
        <DomainsCard
          domainResults={domainResults}
          showAll={showAll}
          onToggle={onToggle}
          domainError={domainError}
        />
      </div>

      {/* AI */}
      <div style={{ marginBottom: 14 }}>
        <AiCard report={report} />
      </div>

      {/* Unlock bar */}
      <UnlockBar query={query} />
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function HomeClient() {
  const [query, setQuery]               = useState("");
  const [report, setReport]             = useState<NamecheckReport | null>(null);
  const [domainResults, setDomainResults] = useState<HostUpDomainResult[]>([]);
  const [reportError, setReportError]   = useState("");
  const [domainError, setDomainError]   = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [showAllDomains, setShowAllDomains] = useState(false);

  const domainBase  = useMemo(() => normalizeDomainBase(query), [query]);
  const domainNames = useMemo(
    () => domainBase ? DOMAIN_SUFFIXES.map((suffix) => `${domainBase}${suffix}`) : [],
    [domainBase],
  );
  const reportWithHostUpDomains = useMemo(
    () => report ? mergeHostUpResultsIntoReport(report, domainResults) : null,
    [report, domainResults],
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
      }),
      fetch("/api/hostup/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          success?: boolean; data?: unknown[]; results?: unknown[]; error?: string;
        };
        console.log("Domän API-svar:", payload);
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
      {/* ── HERO ── */}
      <section style={{
        position: "relative", minHeight: 420,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "70px 24px 50px", textAlign: "center",
        overflow: "hidden",
      }}>
        {/* radial glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(29,86,160,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* badge */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(45,125,210,0.12)",
          border: "1px solid rgba(45,125,210,0.25)",
          borderRadius: 20, padding: "5px 14px",
          marginBottom: 24,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--se-yellow)", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "#7ab3e8" }}>AI-driven namnkoll för svenska bolag</span>
        </div>

        {/* H1 */}
        <h1 style={{
          position: "relative", zIndex: 1,
          fontFamily: "var(--font-dm-serif-display), 'DM Serif Display', serif",
          fontSize: "clamp(32px, 5vw, 52px)",
          fontWeight: 400,
          color: "var(--text-primary)",
          maxWidth: 620,
          lineHeight: 1.15,
          marginBottom: 20,
        }}>
          Rätt företagsnamn —{" "}
          <span style={{ color: "var(--se-yellow)" }}>utan</span>{" "}
          obehagliga överraskningar
        </h1>

        {/* subtitle */}
        <p style={{
          position: "relative", zIndex: 1,
          fontSize: 17, color: "var(--text-secondary)",
          maxWidth: 460, lineHeight: 1.6, marginBottom: 32,
        }}>
          Kontrollera domäner, sociala handles och varumärkeskonflikter innan du registrerar hos Bolagsverket.
        </p>

        {/* search box */}
        <form
          onSubmit={handleSubmit}
          style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 580 }}
        >
          <label className="sr-only" htmlFor="name-search">Företagsnamn</label>
          <div style={{ position: "relative" }}>
            <input
              id="name-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={MAX_QUERY_LENGTH}
              placeholder="T.ex. Solros Konsult eller Nordkraft..."
              style={{
                width: "100%",
                background: "var(--bg-card)",
                border: "1.5px solid var(--border-accent)",
                borderRadius: 14,
                padding: "18px 170px 18px 22px",
                fontSize: 17,
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: isLoading ? "var(--se-yellow-muted)" : "var(--se-yellow)",
                color: "#0a0e1a",
                fontWeight: 600,
                borderRadius: 9,
                padding: "10px 22px",
                border: "none",
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontSize: 14,
                display: "flex", alignItems: "center", gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              {isLoading ? (
                <span style={{
                  width: 14, height: 14,
                  border: "2px solid rgba(10,14,26,0.3)",
                  borderTopColor: "#0a0e1a",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }} />
              ) : null}
              {isLoading ? "Kontrollerar..." : "Kolla namnet →"}
            </button>
          </div>
        </form>

        {/* error */}
        {reportError ? (
          <p style={{
            position: "relative", zIndex: 1,
            marginTop: 12, fontSize: 13,
            color: "var(--red)", maxWidth: 580,
          }}>
            {reportError}
          </p>
        ) : null}

        {/* hint row */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", alignItems: "center", gap: 16, marginTop: 16,
          fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap", justifyContent: "center",
        }}>
          <span><span style={{ color: "var(--green)" }}>●</span> Domäner (.se, .com, .nu)</span>
          <span><span style={{ color: "var(--se-blue-light)" }}>●</span> Instagram · TikTok · X · YouTube</span>
          <span><span style={{ color: "var(--se-yellow)" }}>●</span> AI-riskbedömning</span>
        </div>
      </section>

      {/* ── RESULTS ── */}
      {reportWithHostUpDomains ? (
        <ResultsSection
          report={reportWithHostUpDomains}
          domainResults={domainResults}
          showAll={showAllDomains}
          onToggle={() => setShowAllDomains((v) => !v)}
          domainError={domainError}
          query={query}
        />
      ) : null}

      {/* spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
