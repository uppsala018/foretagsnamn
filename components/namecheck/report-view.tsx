import type { ReactNode } from "react";
import type { NamecheckReport, NamecheckResult } from "@/lib/namecheck/types";
import { ResultCard } from "./result-card";

const SOCIAL_CATEGORIES = new Set(["instagram", "tiktok"]);

const SOCIAL_PLATFORMS = [
  { name: "Instagram", key: "instagram", initial: "IG" },
  { name: "TikTok", key: "tiktok", initial: "TT" },
  { name: "Facebook", key: "facebook", initial: "FB" },
  { name: "YouTube", key: "youtube", initial: "YT" },
  { name: "LinkedIn", key: "linkedin", initial: "IN" },
  { name: "Pinterest", key: "pinterest", initial: "PI" },
] as const;

type ReportViewProps = {
  report: NamecheckReport;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
};

function statusLabel(result?: NamecheckResult): string {
  if (result?.status === "available") {
    return "Möjligen ledigt";
  }

  if (result?.status === "taken") {
    return "Möjligen upptaget";
  }

  return "Indikativt";
}

function SocialMediaCard({ report }: { report: NamecheckReport }) {
  const socialResults = new Map(
    report.results
      .filter((result) => SOCIAL_CATEGORIES.has(result.category))
      .map((result) => [result.category, result]),
  );
  const largePlatforms = SOCIAL_PLATFORMS.slice(0, 4);
  const smallPlatforms = SOCIAL_PLATFORMS.slice(4);

  return (
    <article className="rounded-lg border border-[#d8d6c8] bg-white p-5 shadow-sm md:col-span-2 xl:col-span-1">
      <div>
        <h3 className="text-lg font-semibold">Sociala medier</h3>
        <p className="mt-1 text-sm leading-6 text-[#58655e]">
          Samma handle kontrolleras indikativt pĂĄ prioriterade plattformar.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {largePlatforms.map((platform) => {
          const result = socialResults.get(platform.key as "instagram" | "tiktok");
          const value = result?.value ?? `@${report.suggestions.baseSlug.replace(/-/g, "")}`;

          return (
            <div key={platform.key} className="rounded-md border border-[#d8d6c8] bg-[#f7f7f2] p-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#15201b] text-xs font-semibold text-white">
                  {platform.initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{platform.name}</p>
                  <p className="truncate text-xs text-[#58655e]">{value}</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-[#54665c]">{statusLabel(result)}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {smallPlatforms.map((platform) => (
          <span
            key={platform.key}
            title={platform.name}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d6c8] bg-white text-xs font-semibold text-[#15201b]"
          >
            {platform.initial}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#58655e]">
        Indikativ offentlig profilkontroll
      </p>
    </article>
  );
}

export function ReportView({
  report,
  title = report.normalizedQuery,
  eyebrow = "Samlad rapport",
  action,
}: ReportViewProps) {
  const reportResults = report.results.filter((result) => !SOCIAL_CATEGORIES.has(result.category));

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
        {reportResults.map((result) => (
          <ResultCard key={result.category} result={result} />
        ))}
        <SocialMediaCard report={report} />
      </div>

      {action}

      <p className="rounded-md border border-[#d8d6c8] bg-white px-4 py-3 text-sm text-[#58655e]">
        {report.disclaimer}
      </p>
    </section>
  );
}
