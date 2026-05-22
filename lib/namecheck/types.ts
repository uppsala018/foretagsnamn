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
  checkLabel?: "Verifierad via Namecheap" | "Preliminär namnkontroll" | "Indikativ kontroll" | "Indikativ offentlig profilkontroll" | "AI-bedömning";
  source?: "namecheap" | "openrouter" | "mock" | "fallback" | "unsupported_tld_fallback" | "public_profile_check" | "rules_based_precheck";
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
  provider: "mock" | "mixed" | "namecheap";
  aiModel: string;
  disclaimer: string;
  suggestions: NamecheckSuggestions;
  results: NamecheckResult[];
};

export interface NamecheckProvider {
  check(targets: NamecheckTarget[], query: string): Promise<NamecheckResult[]>;
}
