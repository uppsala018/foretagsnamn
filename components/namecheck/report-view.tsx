import type { ReactNode } from "react";
import type { NamecheckReport, NamecheckResult } from "@/lib/namecheck/types";
import { ResultCard } from "./result-card";

const SOCIAL_CATEGORIES = new Set(["instagram", "tiktok"]);

const SOCIAL_PLATFORMS = [
  { name: "Instagram", key: "instagram", initial: "IG" },
  { name: "TikTok",    key: "tiktok",    initial: "TT" },
  { name: "Facebook",  key: "facebook",  initial: "FB" },
  { name: "YouTube",   key: "youtube",   initial: "YT" },
  { name: "LinkedIn",  key: "linkedin",  initial: "IN" },
  { name: "Pinterest", key: "pinterest", initial: "PI" },
] as const;

type ReportViewProps = {
  report: NamecheckReport;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
};

function statusLabel(result?: NamecheckResult): string {
  if (result?.status === "available") return "Möjligen ledigt";
  if (result?.status === "taken")     return "Möjligen upptaget";
  return "Indikativt";
}

function statusColor(result?: NamecheckResult): string {
  if (result?.status === "available") return "#4ade80";
  if (result?.status === "taken")     return "#f87171";
  return "var(--text-muted)";
}

function SocialMediaCard({ report }: { report: NamecheckReport }) {
  const socialResults = new Map(
    report.results
      .filter((r) => SOCIAL_CATEGORIES.has(r.category))
      .map((r) => [r.category, r]),
  );
  const largePlatforms = SOCIAL_PLATFORMS.slice(0, 4);
  const smallPlatforms = SOCIAL_PLATFORMS.slice(4);

  return (
    <article style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12, padding: "16px 20px",
      gridColumn: "span 2",
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Sociala medier</h3>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
        Indikativ offentlig profilkontroll
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {largePlatforms.map((platform) => {
          const result = socialResults.get(platform.key as "instagram" | "tiktok");
          const value  = result?.value ?? `@${report.suggestions.baseSlug.replace(/-/g, "")}`;
          const color  = statusColor(result);
          return (
            <div key={platform.key} style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 10, padding: "10px 12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(45,125,210,0.15)",
                  border: "1px solid rgba(45,125,210,0.2)",
                  color: "#7ab3e8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {platform.initial}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{platform.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
                </div>
              </div>
              <p style={{ marginTop: 8, fontSize: 12, fontWeight: 500, color }}>{statusLabel(result)}</p>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {smallPlatforms.map((platform) => (
          <span key={platform.key} title={platform.name} style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            color: "var(--text-muted)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700,
          }}>
            {platform.initial}
          </span>
        ))}
      </div>
    </article>
  );
}

export function ReportView({
  report,
  title = report.normalizedQuery,
  eyebrow = "Samlad rapport",
  action,
}: ReportViewProps) {
  const reportResults = report.results.filter((r) => !SOCIAL_CATEGORIES.has(r.category));

  return (
    <section aria-live="polite" style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex", flexWrap: "wrap",
        justifyContent: "space-between", alignItems: "flex-end",
        gap: 8, marginBottom: 20,
      }}>
        <div>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--se-yellow-muted)", marginBottom: 6 }}>
            {eyebrow}
          </p>
          <h2 style={{
            fontFamily: "var(--font-dm-serif-display), 'DM Serif Display', serif",
            fontSize: 28, fontWeight: 400, color: "var(--text-primary)",
          }}>
            {title}
          </h2>
          {title !== report.normalizedQuery ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{report.normalizedQuery}</p>
          ) : null}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Teknisk förhandskontroll</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {reportResults.map((result) => (
          <ResultCard key={result.category} result={result} />
        ))}
        <SocialMediaCard report={report} />
      </div>

      {action}

      <p style={{
        marginTop: 16,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10, padding: "12px 16px",
        fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6,
      }}>
        {report.disclaimer}
      </p>
    </section>
  );
}
