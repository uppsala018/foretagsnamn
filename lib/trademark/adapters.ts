import "server-only";

import { getPrvConfig, getTmviewConfig } from "./config";
import type { TrademarkMatch, TrademarkSourceResult } from "./types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  for (const key of ["results", "data", "items", "trademarks", "hits"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeMatch(value: unknown): TrademarkMatch | null {
  if (!isRecord(value)) return null;
  const nested = isRecord(value.trademark) ? value.trademark : value;
  const name =
    readString(nested.name) ??
    readString(nested.markName) ??
    readString(nested.trademarkName) ??
    readString(nested.markVerbalElementText) ??
    readString(nested.verbalElement);

  if (!name) return null;

  return {
    name,
    owner:
      readString(nested.owner) ??
      readString(nested.ownerName) ??
      readString(nested.applicantName) ??
      null,
    status: readString(nested.status) ?? readString(nested.markCurrentStatusCode) ?? null,
    applicationNumber:
      readString(nested.applicationNumber) ??
      readString(nested.registrationNumber) ??
      readString(nested.tradeMarkIdentifier) ??
      null,
    url: readString(nested.url) ?? null,
  };
}

async function fetchTrademarkSource(
  searchUrl: string,
  apiKey: string,
  query: string,
): Promise<TrademarkMatch[]> {
  const url = new URL(searchUrl);
  if (!url.searchParams.has("q") && !url.searchParams.has("query")) {
    url.searchParams.set("q", query);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Trademark source returned ${response.status}`);
  }

  const payload = await response.json() as unknown;
  return readArray(payload).map(normalizeMatch).filter((item): item is TrademarkMatch => item !== null).slice(0, 8);
}

export async function checkPrv(query: string): Promise<TrademarkSourceResult> {
  const config = getPrvConfig();
  if (!config.searchUrl || !config.apiKey) {
    return {
      source: "prv",
      label: "Svenska PRV",
      status: "not_configured",
      message: "PRV-koppling saknar PRV_TRADEMARK_SEARCH_URL och/eller PRV_API_KEY.",
      matches: [],
    };
  }

  try {
    const matches = await fetchTrademarkSource(config.searchUrl, config.apiKey, query);
    return {
      source: "prv",
      label: "Svenska PRV",
      status: "checked",
      message: matches.length ? "Möjliga träffar från PRV." : "Inga träffar från PRV i API-svaret.",
      matches,
    };
  } catch {
    return {
      source: "prv",
      label: "Svenska PRV",
      status: "error",
      message: "PRV-kontrollen kunde inte genomföras just nu.",
      matches: [],
    };
  }
}

export async function checkTmview(query: string): Promise<TrademarkSourceResult> {
  const config = getTmviewConfig();
  if (!config.searchUrl || !config.apiKey) {
    return {
      source: "tmview",
      label: "EU/TMview",
      status: "not_configured",
      message: "TMview/EUIPO-koppling saknar TMVIEW_TRADEMARK_SEARCH_URL och/eller TMVIEW_API_KEY.",
      matches: [],
    };
  }

  try {
    const matches = await fetchTrademarkSource(config.searchUrl, config.apiKey, query);
    return {
      source: "tmview",
      label: "EU/TMview",
      status: "checked",
      message: matches.length ? "Möjliga träffar från EU/TMview." : "Inga träffar från EU/TMview i API-svaret.",
      matches,
    };
  } catch {
    return {
      source: "tmview",
      label: "EU/TMview",
      status: "error",
      message: "EU/TMview-kontrollen kunde inte genomföras just nu.",
      matches: [],
    };
  }
}
