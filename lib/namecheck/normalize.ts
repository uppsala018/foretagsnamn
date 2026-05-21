import type { NamecheckSuggestions } from "./types";

const SWEDISH_DOMAIN_CHARACTERS: Record<string, string> = {
  å: "a",
  ä: "a",
  ö: "o",
  é: "e",
  è: "e",
  ü: "u",
};

export function normalizeQuery(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function toAsciiSlug(input: string): string {
  const normalized = normalizeQuery(input).toLowerCase();
  const transliterated = normalized.replace(
    /[åäöéèü]/g,
    (character) => SWEDISH_DOMAIN_CHARACTERS[character] ?? character,
  );

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function toHandle(input: string): string {
  return toAsciiSlug(input).replace(/-/g, "").slice(0, 30);
}

export function createSuggestions(input: string): NamecheckSuggestions {
  const baseSlug = toAsciiSlug(input) || "namn";
  const handle = toHandle(input) || "namn";

  return {
    baseSlug,
    domains: {
      se: `${baseSlug}.se`,
      com: `${baseSlug}.com`,
    },
    handles: {
      instagram: `@${handle}`,
      tiktok: `@${handle}`,
    },
  };
}
