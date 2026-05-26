export type ResultStatus =
  | "available"
  | "taken"
  | "uncertain"
  | "error"
  | "not_checked";

export type CheckCategory =
  | "company_name"
  | "domain_se"
  | "domain_com"
  | "trademark_check"
  | "instagram"
  | "tiktok"
  | "ai_assessment";

export type BrandRisk = "low" | "medium" | "high" | "uncertain";

export type AiBrandAnalysis = {
  overallRisk: BrandRisk;
  summary: string;
  strengths: string[];
  warnings: string[];
  suggestedAlternatives: string[];
  legalDisclaimer: string;
};

export type NamecheckTarget = {
  category: CheckCategory;
  label: string;
  value: string;
};

export type NamecheckResult = NamecheckTarget & {
  status: ResultStatus;
  summary: string;
  details?: string;
  checkLabel?: "Preliminär namnkontroll" | "Indikativ kontroll" | "Indikativ offentlig profilkontroll" | "AI-bedömning" | "Varumärkeskoll";
  source?: "openrouter" | "mock" | "fallback" | "unsupported_tld_fallback" | "public_profile_check" | "rules_based_precheck" | "external_trademark_check";
  metadata?: {
    isPremiumName?: boolean;
    premiumRegistrationPrice?: string;
    premiumRenewalPrice?: string;
    fallbackReason?: string;
    confidence?: "indicative" | "low";
    checkedUrl?: string;
    checkedAt?: string;
    warning?: string;
    warnings?: string[];
    suggestions?: string[];
    riskLevel?: BrandRisk;
    aiAnalysis?: AiBrandAnalysis;
    aiModel?: string;
    trademarkCheck?: {
      status: "checked" | "not_configured" | "error";
      checkedAt: string;
      sources: Array<{
        source: "prv" | "tmview";
        label: string;
        status: "checked" | "not_configured" | "error";
        message: string;
        matches: Array<{
          name: string;
          owner?: string | null;
          status?: string | null;
          applicationNumber?: string | null;
          url?: string | null;
        }>;
      }>;
    };
  };
};

export type NamecheckSuggestions = {
  baseSlug: string;
  domains: {
    se: string;
    com: string;
  };
  handles: {
    instagram: string;
    tiktok: string;
  };
};

export type NamecheckReport = {
  query: string;
  normalizedQuery: string;
  generatedAt: string;
  provider: "mock" | "mixed";
  aiModel: string;
  disclaimer: string;
  suggestions: NamecheckSuggestions;
  results: NamecheckResult[];
};

export interface NamecheckProvider {
  check(targets: NamecheckTarget[], query: string): Promise<NamecheckResult[]>;
}
