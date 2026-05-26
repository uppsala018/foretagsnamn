import type {
  NamecheckProvider,
  NamecheckResult,
  NamecheckTarget,
  ResultStatus,
} from "./types";

const STATUS_BY_CATEGORY: Record<NamecheckTarget["category"], ResultStatus> = {
  company_name: "uncertain",
  domain_se: "available",
  domain_com: "taken",
  trademark_check: "not_checked",
  instagram: "uncertain",
  tiktok: "not_checked",
  ai_assessment: "uncertain",
};

function summaryFor(target: NamecheckTarget, query: string): string {
  switch (target.category) {
    case "company_name":
      return "Indikativ kontroll kräver senare koppling mot officiella register och likhetslogik.";
    case "domain_se":
      return "Mockad signal visar namnet som möjligt, men ingen riktig domänkontroll är gjord.";
    case "domain_com":
      return "Mockad signal visar möjlig träff eller upptaget namn för .com.";
    case "trademark_check":
      return "Extern varumärkeskoll körs via separata PRV/TMview-adaptrar när de är konfigurerade.";
    case "instagram":
      return "Handle-förslag framtaget. Tillgänglighet behöver verifieras via godkänd källa senare.";
    case "tiktok":
      return "Inte kontrollerad i MVP. Förslaget är normaliserat för framtida verifiering.";
    case "ai_assessment":
      return `Mockad AI-bedömning för "${query}" med planerad OpenRouter-modell tencent/hy3-preview.`;
    default:
      return "Kontrollen kunde inte sammanfattas.";
  }
}

export const mockNamecheckProvider: NamecheckProvider = {
  async check(targets, query): Promise<NamecheckResult[]> {
    return targets.map((target) => ({
      ...target,
      status: STATUS_BY_CATEGORY[target.category],
      summary: summaryFor(target, query),
      details: "Indikativ kontroll. Real provider kan ersätta denna mock utan att ändra API-kontraktet.",
      checkLabel: "Indikativ kontroll",
      source: "mock",
    }));
  },
};
