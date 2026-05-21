import type { BrandRisk, NamecheckResult, NamecheckTarget } from "./types";

const GENERIC_WORDS = new Set([
  "consulting",
  "konsult",
  "service",
  "tjänst",
  "gruppen",
  "group",
  "solutions",
  "solution",
  "handel",
  "företag",
  "company",
  "business",
  "media",
  "design",
  "tech",
  "digital",
]);

const LEGAL_FORM_TERMS = new Set(["ab", "hb", "kb", "ef"]);
const MISLEADING_WORDS = [
  "bank",
  "försäkring",
  "forsakring",
  "universitet",
  "myndighet",
  "kommun",
  "region",
];
const SWEDISH_VOWELS = /[aeiouyåäö]/i;

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function hasLegalFormIssue(words: string[]): boolean {
  const legalIndexes = words
    .map((word, index) => LEGAL_FORM_TERMS.has(word.replace(/\./g, "")) ? index : -1)
    .filter((index) => index >= 0);

  if (legalIndexes.length === 0) {
    return false;
  }

  return legalIndexes.length > 1 || legalIndexes.some((index) => index !== words.length - 1);
}

function readabilityWarning(name: string, words: string[]): string | null {
  if (!SWEDISH_VOWELS.test(name)) {
    return "Namnet saknar tydliga vokaler och kan bli svårt att uttala på svenska.";
  }

  if (words.some((word) => word.length > 18)) {
    return "Minst ett ord är långt, vilket kan göra namnet svårare att minnas och uttala.";
  }

  if (/[^\p{L}\p{N}\s&.-]/u.test(name)) {
    return "Namnet innehåller specialtecken som kan skapa praktiska problem i register, domäner eller handles.";
  }

  return null;
}

function distinctivenessScore(words: string[]): number {
  const genericCount = words.filter((word) => GENERIC_WORDS.has(word)).length;
  const uniqueLongWords = words.filter((word) => word.length >= 5 && !GENERIC_WORDS.has(word)).length;
  return uniqueLongWords * 2 - genericCount;
}

function riskFromWarnings(warnings: string[], score: number): BrandRisk {
  if (warnings.length >= 4 || score <= -2) {
    return "high";
  }

  if (warnings.length >= 2 || score <= 0) {
    return "medium";
  }

  if (warnings.length === 1) {
    return "medium";
  }

  return "low";
}

function statusFromRisk(risk: BrandRisk): NamecheckResult["status"] {
  if (risk === "low") {
    return "available";
  }

  if (risk === "high") {
    return "taken";
  }

  return "uncertain";
}

function summaryFromRisk(risk: BrandRisk): string {
  if (risk === "low") {
    return "Preliminär namnkontroll visar låg regelbaserad risk, men ingen officiell registerkontroll är gjord.";
  }

  if (risk === "high") {
    return "Preliminär namnkontroll visar hög risk för generiskt, missvisande eller svårregistrerat namn.";
  }

  return "Preliminär namnkontroll visar några riskpunkter som bör granskas manuellt.";
}

function suggestionsFor(words: string[], warnings: string[]): string[] {
  const suggestions = new Set<string>();

  if (warnings.some((warning) => warning.includes("generiskt"))) {
    suggestions.add("Lägg till ett mer särskiljande ord, platsnamn eller fantasielement.");
  }

  if (warnings.some((warning) => warning.includes("juridisk form"))) {
    suggestions.add("Använd juridisk form endast om den stämmer med bolagsformen och placera den sist.");
  }

  if (warnings.some((warning) => warning.includes("missvisande"))) {
    suggestions.add("Undvik reglerade eller myndighetsliknande ord om verksamheten inte tydligt motiverar dem.");
  }

  if (words.length <= 1) {
    suggestions.add("Testa en tvåordsvariant för bättre särskiljningsförmåga.");
  }

  if (suggestions.size === 0) {
    suggestions.add("Gör manuell sökning hos Bolagsverket och varumärkesdatabaser innan beslut.");
  }

  return [...suggestions].slice(0, 5);
}

export function checkCompanyName(target: NamecheckTarget): NamecheckResult {
  const name = target.value.trim();
  const words = tokenize(name);
  const warnings: string[] = [];

  if (name.length < 3 || words.join("").length < 3) {
    warnings.push("Namnet är mycket kort och kan vara svårt att särskilja.");
  }

  if (words.length === 1 && GENERIC_WORDS.has(words[0])) {
    warnings.push("Namnet ser mycket generiskt ut och saknar tydligt särskiljande element.");
  } else if (words.length > 0 && words.every((word) => GENERIC_WORDS.has(word))) {
    warnings.push("Namnet består främst av generiska ord och kan få svag särskiljningsförmåga.");
  }

  if (hasLegalFormIssue(words)) {
    warnings.push("Namnet innehåller juridisk form som AB, HB, KB eller EF på ett sätt som bör kontrolleras.");
  }

  const misleadingWord = words.find((word) => MISLEADING_WORDS.includes(word));
  if (misleadingWord) {
    warnings.push(`Namnet innehåller "${misleadingWord}", vilket kan uppfattas som reglerat eller missvisande.`);
  }

  const readability = readabilityWarning(name, words);
  if (readability) {
    warnings.push(readability);
  }

  const score = distinctivenessScore(words);
  if (score <= 0 && warnings.length === 0) {
    warnings.push("Namnet har begränsad särskiljningsförmåga och bör jämföras manuellt mot liknande namn.");
  }

  const riskLevel = riskFromWarnings(warnings, score);
  const suggestions = suggestionsFor(words, warnings);

  return {
    ...target,
    status: statusFromRisk(riskLevel),
    summary: summaryFromRisk(riskLevel),
    details: "Detta är inte en officiell kontroll hos Bolagsverket.",
    checkLabel: "Preliminär namnkontroll",
    source: "rules_based_precheck",
    metadata: {
      confidence: "indicative",
      riskLevel,
      warnings,
      suggestions,
    },
  };
}
