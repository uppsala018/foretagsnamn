import { checkCompanyName } from "./company-name-provider";
import { mockNamecheckProvider } from "./mock-provider";
import {
  analyzeBrandNameWithOpenRouter,
  getOpenRouterModel,
  hasOpenRouterConfig,
} from "./openrouter-provider";
import { createSuggestions, normalizeQuery } from "./normalize";
import { checkSocialProfiles } from "./social-provider";
import type { AiBrandAnalysis, NamecheckReport, NamecheckResult, NamecheckTarget } from "./types";
import { createTrademarkNamecheckResult } from "@/lib/trademark";

const DOMAIN_CATEGORIES = new Set<NamecheckTarget["category"]>([
  "domain_se",
  "domain_com",
]);

const SOCIAL_CATEGORIES = new Set<NamecheckTarget["category"]>([
  "instagram",
  "tiktok",
]);

function markDomainFallback(results: NamecheckResult[], reason: string): NamecheckResult[] {
  return results.map((result) => {
    if (!DOMAIN_CATEGORIES.has(result.category)) {
      return result;
    }

    return {
      ...result,
      status: "uncertain",
      summary: "Domänkontrollen kunde inte verifieras just nu.",
      details: "Indikativ kontroll med mockad fallback. Ingen riktig domänkontroll är gjord.",
      checkLabel: "Indikativ kontroll",
      source: "fallback",
      metadata: {
        ...result.metadata,
        fallbackReason: reason,
      },
    };
  });
}

function markSocialFallback(results: NamecheckResult[], reason: string): NamecheckResult[] {
  return results.map((result) => ({
    ...result,
    status: "uncertain",
    summary: "Den offentliga profilkontrollen kunde inte verifieras just nu.",
    details: "Indikativ kontroll med mockad fallback. Kontrollera alltid sociala medier manuellt innan beslut.",
    checkLabel: "Indikativ offentlig profilkontroll",
    source: "fallback",
    metadata: {
      ...result.metadata,
      confidence: "indicative",
      fallbackReason: reason,
      warning: "Sociala medier kan blockera automatiska kontroller. Kontrollera alltid manuellt innan beslut.",
    },
  }));
}

function fallbackAiAnalysis(reason: string): NamecheckResult {
  return {
    category: "ai_assessment",
    label: "AI-bedömning",
    value: "Namnanalys",
    status: "uncertain",
    summary: "AI-bedömningen kunde inte verifieras just nu.",
    details: "AI-bedömningen är inte juridisk rådgivning.",
    checkLabel: "Indikativ kontroll",
    source: "fallback",
    metadata: {
      fallbackReason: reason,
      aiModel: getOpenRouterModel(),
      aiAnalysis: {
        overallRisk: "uncertain",
        summary: "AI-bedömningen kunde inte verifieras just nu. Gör en manuell bedömning innan beslut.",
        strengths: [],
        warnings: ["Ingen verklig AI-analys kunde hämtas i denna körning."],
        suggestedAlternatives: [],
        legalDisclaimer: "AI-bedömningen är inte juridisk rådgivning.",
      },
    },
  };
}

function riskToStatus(risk: AiBrandAnalysis["overallRisk"]): NamecheckResult["status"] {
  if (risk === "low") {
    return "available";
  }

  if (risk === "high") {
    return "taken";
  }

  return "uncertain";
}

function createAiResult(name: string, analysis: AiBrandAnalysis): NamecheckResult {
  return {
    category: "ai_assessment",
    label: "AI-bedömning",
    value: name,
    status: riskToStatus(analysis.overallRisk),
    summary: analysis.summary,
    details: analysis.legalDisclaimer || "AI-bedömningen är inte juridisk rådgivning.",
    checkLabel: "AI-bedömning",
    source: "openrouter",
    metadata: {
      aiModel: getOpenRouterModel(),
      aiAnalysis: analysis,
    },
  };
}

async function createDomainResults(
  domainTargets: NamecheckTarget[],
  normalizedQuery: string,
): Promise<NamecheckResult[]> {
  const mockDomainResults = await mockNamecheckProvider.check(domainTargets, normalizedQuery);
  return markDomainFallback(mockDomainResults, "domain_check_handled_by_hostup_cards");
}

async function createSocialResults(
  socialTargets: NamecheckTarget[],
  normalizedQuery: string,
): Promise<NamecheckResult[]> {
  try {
    return await checkSocialProfiles(socialTargets);
  } catch (error) {
    console.warn(
      "Social profile check failed; using mock fallback.",
      error instanceof Error ? error.name : "UnknownError",
    );
    const mockSocialResults = await mockNamecheckProvider.check(socialTargets, normalizedQuery);
    return markSocialFallback(mockSocialResults, "social_check_failed");
  }
}

async function createAiAssessmentResult(
  normalizedQuery: string,
  reportResults: NamecheckResult[],
): Promise<NamecheckResult> {
  if (!hasOpenRouterConfig()) {
    return fallbackAiAnalysis("missing_openrouter_config");
  }

  try {
    const analysis = await analyzeBrandNameWithOpenRouter(normalizedQuery, reportResults);
    return createAiResult(normalizedQuery, analysis);
  } catch (error) {
    console.warn(
      "OpenRouter brand analysis failed; using fallback.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return fallbackAiAnalysis("openrouter_api_failed");
  }
}

export async function createNamecheckReport(query: string): Promise<NamecheckReport> {
  const normalizedQuery = normalizeQuery(query);
  const suggestions = createSuggestions(normalizedQuery);

  const targets: NamecheckTarget[] = [
    {
      category: "company_name",
      label: "Företagsnamn",
      value: normalizedQuery,
    },
    {
      category: "domain_se",
      label: ".se domain",
      value: suggestions.domains.se,
    },
    {
      category: "domain_com",
      label: ".com domain",
      value: suggestions.domains.com,
    },
    {
      category: "trademark_check",
      label: "Varumärkeskoll",
      value: normalizedQuery,
    },
    {
      category: "instagram",
      label: "Instagram",
      value: suggestions.handles.instagram,
    },
    {
      category: "tiktok",
      label: "TikTok",
      value: suggestions.handles.tiktok,
    },
    {
      category: "ai_assessment",
      label: "AI-bedömning",
      value: normalizedQuery,
    },
  ];

  const domainTargets = targets.filter((target) => DOMAIN_CATEGORIES.has(target.category));
  const socialTargets = targets.filter((target) => SOCIAL_CATEGORIES.has(target.category));
  const companyTarget = targets.find((target) => target.category === "company_name");
  const placeholderTargets = targets.filter(
    (target) =>
      target.category !== "company_name"
      &&
      !DOMAIN_CATEGORIES.has(target.category)
      && !SOCIAL_CATEGORIES.has(target.category)
      && target.category !== "trademark_check"
      && target.category !== "ai_assessment",
  );

  const placeholderResults = await mockNamecheckProvider.check(placeholderTargets, normalizedQuery);
  const companyResult = companyTarget ? checkCompanyName(companyTarget) : null;
  const [domainResults, socialResults, trademarkResult] = await Promise.all([
    createDomainResults(domainTargets, normalizedQuery),
    createSocialResults(socialTargets, normalizedQuery),
    createTrademarkNamecheckResult(normalizedQuery),
  ]);
  const preAiResults = [
    ...placeholderResults,
    ...(companyResult ? [companyResult] : []),
    ...domainResults,
    trademarkResult,
    ...socialResults,
  ];
  const aiResult = await createAiAssessmentResult(normalizedQuery, preAiResults);

  const resultByCategory = new Map(
    [...preAiResults, aiResult].map((result) => [result.category, result]),
  );
  const results = targets.map(
    (target) =>
      resultByCategory.get(target.category) ?? {
        ...target,
        status: "error" as const,
        summary: "Kontrollen kunde inte genomföras.",
        checkLabel: "Indikativ kontroll" as const,
        source: "fallback" as const,
      },
  );

  return {
    query,
    normalizedQuery,
    generatedAt: new Date().toISOString(),
    provider: "mock",
    aiModel: getOpenRouterModel(),
    disclaimer: "Resultatet är en teknisk förhandskontroll och inte juridisk rådgivning. Detta är inte en officiell kontroll hos Bolagsverket. Kontrollera även hos Verksamt/Bolagsverket. För en officiell bedömning måste namnet prövas av Bolagsverket vid registrering. Sociala medier kan blockera automatiska kontroller. Kontrollera alltid manuellt innan beslut.",
    suggestions,
    results,
  };
}
