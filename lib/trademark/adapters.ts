import "server-only";

import { getPrvConfig, getTmviewConfig } from "./config";
import type { TrademarkMatch, TrademarkSourceResult } from "./types";

type JsonRecord = Record<string, unknown>;

class TrademarkSourceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly detail?: string,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  for (const key of ["trademarks", "results", "data", "items", "hits"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeMatch(value: unknown): TrademarkMatch | null {
  if (!isRecord(value)) return null;
  const nested = isRecord(value.trademark) ? value.trademark : value;
  const wordMark = isRecord(nested.wordMarkSpecification) ? nested.wordMarkSpecification : null;
  const applicants = Array.isArray(nested.applicants) ? nested.applicants : [];
  const firstApplicant = isRecord(applicants[0]) ? applicants[0] : null;
  const name =
    readString(nested.name) ??
    readString(nested.markName) ??
    readString(nested.trademarkName) ??
    readString(nested.markVerbalElementText) ??
    readString(nested.verbalElement) ??
    readString(wordMark?.verbalElement);

  if (!name) return null;

  return {
    name,
    owner:
      readString(nested.owner) ??
      readString(nested.ownerName) ??
      readString(nested.applicantName) ??
      readString(firstApplicant?.name) ??
      readString(firstApplicant?.identifier) ??
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

function escapeRsqlValue(value: string): string {
  return value.trim().replace(/[\\'"]/g, "\\$&").slice(0, 120);
}

async function getEuipoAccessToken(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "uid",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new TrademarkSourceError(`EUIPO token endpoint returned ${response.status}`, response.status, text);
  }

  const payload = await response.json() as unknown;
  if (!isRecord(payload) || typeof payload.access_token !== "string") {
    throw new TrademarkSourceError("EUIPO token response did not include access_token");
  }

  return payload.access_token;
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
    const text = await response.text().catch(() => "");
    throw new TrademarkSourceError(`Trademark source returned ${response.status}`, response.status, text);
  }

  const payload = await response.json() as unknown;
  return readArray(payload).map(normalizeMatch).filter((item): item is TrademarkMatch => item !== null).slice(0, 8);
}

async function fetchEuipoTmviewSource(
  searchUrl: string,
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  query: string,
): Promise<TrademarkMatch[]> {
  const token = await getEuipoAccessToken(tokenUrl, clientId, clientSecret);
  const url = new URL(searchUrl);
  url.searchParams.set("query", `wordMarkSpecification.verbalElement==*${escapeRsqlValue(query)}*`);
  url.searchParams.set("size", "8");
  url.searchParams.set("page", "0");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-IBM-Client-Id": clientId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new TrademarkSourceError(`EUIPO trademark search returned ${response.status}`, response.status, text);
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
      message: matches.length ? "Mojliga traffar fran PRV." : "Inga traffar fran PRV i API-svaret.",
      matches,
    };
  } catch (error) {
    return {
      source: "prv",
      label: "Svenska PRV",
      status: "error",
      message: error instanceof TrademarkSourceError && error.status
        ? `PRV-kontrollen misslyckades med HTTP ${error.status}.`
        : "PRV-kontrollen kunde inte genomföras just nu.",
      matches: [],
    };
  }
}

function tmviewErrorMessage(error: unknown): string {
  if (!(error instanceof TrademarkSourceError)) {
    return "EU/TMview-kontrollen kunde inte genomföras just nu.";
  }

  if (error.status === 403 && error.detail?.includes("Not registered to plan")) {
    return "EUIPO svarar 403: API-klienten ar inte registrerad pa Trademark Search-planen.";
  }

  if (error.status === 401) {
    return "EUIPO svarar 401: kontrollera TMVIEW_CLIENT_ID och TMVIEW_CLIENT_SECRET.";
  }

  if (error.status) {
    return `EUIPO svarar HTTP ${error.status}.`;
  }

  return "EU/TMview-kontrollen kunde inte genomföras just nu.";
}

export async function checkTmview(query: string): Promise<TrademarkSourceResult> {
  const config = getTmviewConfig();
  const hasOAuth = Boolean(config.searchUrl && config.clientId && config.clientSecret && config.tokenUrl);
  const hasApiKey = Boolean(config.searchUrl && config.apiKey);

  if (!hasOAuth && !hasApiKey) {
    return {
      source: "tmview",
      label: "EU/TMview",
      status: "not_configured",
      message: "TMview/EUIPO-koppling saknar TMVIEW_CLIENT_ID och/eller TMVIEW_CLIENT_SECRET.",
      matches: [],
    };
  }

  try {
    const matches = hasOAuth
      ? await fetchEuipoTmviewSource(config.searchUrl, config.tokenUrl, config.clientId, config.clientSecret, query)
      : await fetchTrademarkSource(config.searchUrl, config.apiKey, query);
    return {
      source: "tmview",
      label: "EU/TMview",
      status: "checked",
      message: matches.length ? "Mojliga traffar fran EU/TMview." : "Inga traffar fran EU/TMview i API-svaret.",
      matches,
    };
  } catch (error) {
    return {
      source: "tmview",
      label: "EU/TMview",
      status: "error",
      message: tmviewErrorMessage(error),
      matches: [],
    };
  }
}

