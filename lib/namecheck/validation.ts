import { normalizeQuery } from "./normalize";

export const MAX_QUERY_LENGTH = 120;

export type QueryValidationResult =
  | { ok: true; query: string }
  | { ok: false; error: string };

export function validateNamecheckQuery(value: unknown): QueryValidationResult {
  if (typeof value !== "string") {
    return {
      ok: false,
      error: "Ange ett företagsnamn att kontrollera.",
    };
  }

  const query = normalizeQuery(value);

  if (!query) {
    return {
      ok: false,
      error: "Ange ett företagsnamn att kontrollera.",
    };
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return {
      ok: false,
      error: `Namnet får vara högst ${MAX_QUERY_LENGTH} tecken.`,
    };
  }

  return {
    ok: true,
    query,
  };
}
