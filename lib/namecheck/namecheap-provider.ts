import type { NamecheckResult, NamecheckTarget } from "./types";
import {
  recordProviderDebug,
  redactUrlSecret,
  summarizeProviderError,
} from "./provider-diagnostics";

const SANDBOX_URL = "https://api.sandbox.namecheap.com/xml.response";
const PRODUCTION_URL = "https://api.namecheap.com/xml.response";

type NamecheapConfig = {
  apiUser: string;
  apiKey: string;
  username: string;
  clientIp: string;
  sandbox: boolean;
};

type NamecheapProxyConfig = {
  url: string;
  secret: string;
};

export type ParsedNamecheapDomain = {
  domain: string;
  available: boolean;
  isPremiumName?: boolean;
  premiumRegistrationPrice?: string;
  premiumRenewalPrice?: string;
};

export type ParsedNamecheapResponse = {
  domains: ParsedNamecheapDomain[];
  errors: string[];
};

function getNamecheapConfig(): NamecheapConfig | null {
  const apiUser = process.env.NAMECHEAP_API_USER;
  const apiKey = process.env.NAMECHEAP_API_KEY;
  const username = process.env.NAMECHEAP_USERNAME;
  const clientIp = process.env.NAMECHEAP_CLIENT_IP;

  if (!apiUser || !apiKey || !username || !clientIp) {
    return null;
  }

  return {
    apiUser,
    apiKey,
    username,
    clientIp,
    sandbox: process.env.NAMECHEAP_SANDBOX !== "false",
  };
}

function getNamecheapProxyConfig(): NamecheapProxyConfig | null {
  const url = process.env.NAMECHEAP_PROXY_URL;
  const secret = process.env.NAMECHEAP_PROXY_SECRET;

  if (!url || !secret) {
    return null;
  }

  return { url, secret };
}

function parseAttributes(attributeText: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([A-Za-z0-9_:-]+)="([^"]*)"/g;

  for (const match of attributeText.matchAll(attributePattern)) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readPremiumPrice(attributes: Record<string, string>, key: string): string | undefined {
  const value = attributes[key];
  return value && value !== "0" ? value : undefined;
}

function isParsedNamecheapDomain(value: unknown): value is ParsedNamecheapDomain {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const domain = value as Partial<ParsedNamecheapDomain>;
  return typeof domain.domain === "string" && typeof domain.available === "boolean";
}

function normalizeParsedNamecheapResponse(value: unknown): ParsedNamecheapResponse {
  if (typeof value !== "object" || value === null) {
    throw new Error("Namecheap proxy returned invalid JSON.");
  }

  const response = value as { domains?: unknown; errors?: unknown };

  return {
    domains: Array.isArray(response.domains)
      ? response.domains.filter(isParsedNamecheapDomain)
      : [],
    errors: Array.isArray(response.errors)
      ? response.errors.filter((error): error is string => typeof error === "string")
      : [],
  };
}

function isUnsupportedTldError(error: string): boolean {
  const normalized = error.toLowerCase();
  return normalized.includes("tld") && normalized.includes("not found");
}

function hasBlockingNamecheapError(errors: string[]): boolean {
  return errors.some((error) => !isUnsupportedTldError(error));
}

function hasUnsupportedTldForTarget(target: NamecheckTarget, errors: string[]): boolean {
  const targetValue = target.value.toLowerCase();
  return errors.some((error) =>
    isUnsupportedTldError(error) && error.toLowerCase().includes(targetValue),
  );
}

function unsupportedTldFallback(target: NamecheckTarget): NamecheckResult {
  return {
    ...target,
    status: "uncertain",
    summary: ".se kunde inte verifieras via Namecheap.",
    details: "TLD:n stöds inte av Namecheap-kontrollen. Kontrollera domänen hos en registrar som hanterar .se.",
    checkLabel: "Indikativ kontroll",
    source: "unsupported_tld_fallback",
    metadata: {
      confidence: "low",
      fallbackReason: "unsupported_tld",
      warning: ".se kunde inte verifieras via Namecheap.",
    },
  };
}

function resultsFromParsedResponse(
  targets: NamecheckTarget[],
  parsed: ParsedNamecheapResponse,
): NamecheckResult[] {
  return targets.map((target) => {
    if (hasUnsupportedTldForTarget(target, parsed.errors)) {
      return unsupportedTldFallback(target);
    }

    const domainResult = parsed.domains.find(
      (result) => result.domain.toLowerCase() === target.value.toLowerCase(),
    );

    if (!domainResult) {
      return {
        ...target,
        status: "uncertain",
        summary: "Domänkontrollen kunde inte verifieras just nu.",
        details: "Namecheap returnerade inget resultat för denna domän.",
        checkLabel: "Indikativ kontroll",
        source: "fallback",
        metadata: {
          fallbackReason: "missing_domain_result",
        },
      };
    }

    return {
      ...target,
      status: domainResult.available ? "available" : "taken",
      summary: domainResult.available
        ? "Namecheap rapporterar domänen som ledig just nu."
        : "Namecheap rapporterar domänen som upptagen just nu.",
      details: domainResult.isPremiumName
        ? "Domänen är markerad som premium hos Namecheap."
        : "Verifierad via Namecheap domains.check.",
      checkLabel: "Verifierad via Namecheap",
      source: "namecheap",
      metadata: {
        isPremiumName: domainResult.isPremiumName,
        premiumRegistrationPrice: domainResult.premiumRegistrationPrice,
        premiumRenewalPrice: domainResult.premiumRenewalPrice,
      },
    };
  });
}

export function parseNamecheapDomainsCheckResponse(xml: string): ParsedNamecheapResponse {
  const errors = [...xml.matchAll(/<Error\b[^>]*>([\s\S]*?)<\/Error>/g)].map((match) =>
    decodeXmlText(match[1].trim()),
  );

  const domains = [...xml.matchAll(/<DomainCheckResult\b([^>]*)\/?>/g)]
    .map((match) => {
      const attributes = parseAttributes(match[1]);

      return {
        domain: attributes.Domain ?? "",
        available: attributes.Available === "true",
        isPremiumName: attributes.IsPremiumName
          ? attributes.IsPremiumName === "true"
          : undefined,
        premiumRegistrationPrice: readPremiumPrice(attributes, "PremiumRegistrationPrice"),
        premiumRenewalPrice: readPremiumPrice(attributes, "PremiumRenewalPrice"),
      };
    })
    .filter((result) => result.domain.length > 0);

  return { domains, errors };
}

export function hasNamecheapConfig(): boolean {
  const configured = getNamecheapProxyConfig() !== null || getNamecheapConfig() !== null;
  recordProviderDebug("namecheap", { configured });
  return configured;
}

async function checkDomainsWithNamecheapProxy(
  targets: NamecheckTarget[],
  proxy: NamecheapProxyConfig,
): Promise<NamecheckResult[]> {
  const safeRequestUrl = proxy.url;

  recordProviderDebug("namecheap", {
    configured: true,
    lastStatus: null,
    lastError: null,
    lastRequestUrl: safeRequestUrl,
  });

  let response: Response;

  try {
    response = await fetch(proxy.url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": proxy.secret,
      },
      body: JSON.stringify({
        domains: targets.map((target) => target.value),
      }),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Namecheap proxy network error.";
    recordProviderDebug("namecheap", {
      configured: true,
      lastStatus: null,
      lastError: errorMessage,
      lastRequestUrl: safeRequestUrl,
    });
    console.warn("Namecheap proxy failed.", {
      status: null,
      requestUrl: safeRequestUrl,
      error: summarizeProviderError(errorMessage),
    });
    throw error;
  }

  recordProviderDebug("namecheap", {
    configured: true,
    lastStatus: response.status,
    lastError: null,
    lastRequestUrl: safeRequestUrl,
  });

  const payload = await response.json().catch(() => null) as unknown;
  const parsed = normalizeParsedNamecheapResponse(payload);

  const blockingErrors = hasBlockingNamecheapError(parsed.errors);

  if (!response.ok || blockingErrors) {
    const proxyError = parsed.errors[0] ?? `Namecheap proxy HTTP status ${response.status}.`;
    recordProviderDebug("namecheap", {
      configured: true,
      lastStatus: response.status,
      lastError: proxyError,
      lastRequestUrl: safeRequestUrl,
    });
    console.warn("Namecheap proxy failed.", {
      status: response.status,
      requestUrl: safeRequestUrl,
      error: summarizeProviderError(proxyError),
    });
    throw new Error(proxyError);
  }

  return resultsFromParsedResponse(targets, parsed);
}

async function checkDomainsWithNamecheapDirect(
  targets: NamecheckTarget[],
  config: NamecheapConfig,
): Promise<NamecheckResult[]> {
  const endpoint = config.sandbox ? SANDBOX_URL : PRODUCTION_URL;
  const params = new URLSearchParams({
    ApiUser: config.apiUser,
    ApiKey: config.apiKey,
    UserName: config.username,
    ClientIp: config.clientIp,
    Command: "namecheap.domains.check",
    DomainList: targets.map((target) => target.value).join(","),
  });

  const requestUrl = `${endpoint}?${params.toString()}`;
  const safeRequestUrl = redactUrlSecret(requestUrl);

  recordProviderDebug("namecheap", {
    configured: true,
    lastStatus: null,
    lastError: null,
    lastRequestUrl: safeRequestUrl,
  });

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      cache: "no-store",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Namecheap network error.";
    recordProviderDebug("namecheap", {
      configured: true,
      lastStatus: null,
      lastError: errorMessage,
      lastRequestUrl: safeRequestUrl,
    });
    console.warn("Namecheap provider failed.", {
      status: null,
      requestUrl: safeRequestUrl,
      error: summarizeProviderError(errorMessage),
    });
    throw error;
  }

  recordProviderDebug("namecheap", {
    configured: true,
    lastStatus: response.status,
    lastError: null,
    lastRequestUrl: safeRequestUrl,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const errorMessage = `Namecheap HTTP status ${response.status}. ${errorText.slice(0, 500)}`;
    recordProviderDebug("namecheap", {
      configured: true,
      lastStatus: response.status,
      lastError: errorMessage,
      lastRequestUrl: safeRequestUrl,
    });
    console.warn("Namecheap provider failed.", {
      status: response.status,
      requestUrl: safeRequestUrl,
      error: summarizeProviderError(errorMessage),
    });
    throw new Error(errorMessage);
  }

  const xml = await response.text();
  const parsed = parseNamecheapDomainsCheckResponse(xml);

  const blockingErrors = hasBlockingNamecheapError(parsed.errors);

  if (blockingErrors) {
    const errorMessage = `Namecheap API error: ${parsed.errors[0]}`;
    recordProviderDebug("namecheap", {
      configured: true,
      lastStatus: response.status,
      lastError: errorMessage,
      lastRequestUrl: safeRequestUrl,
    });
    console.warn("Namecheap provider failed.", {
      status: response.status,
      requestUrl: safeRequestUrl,
      error: summarizeProviderError(errorMessage),
    });
    throw new Error(errorMessage);
  }

  recordProviderDebug("namecheap", {
    configured: true,
    lastStatus: response.status,
    lastError: null,
    lastRequestUrl: safeRequestUrl,
  });

  return resultsFromParsedResponse(targets, parsed);
}

export async function checkDomainsWithNamecheap(
  targets: NamecheckTarget[],
): Promise<NamecheckResult[]> {
  const proxy = getNamecheapProxyConfig();

  if (proxy) {
    return checkDomainsWithNamecheapProxy(targets, proxy);
  }

  const config = getNamecheapConfig();

  if (!config) {
    recordProviderDebug("namecheap", {
      configured: false,
      lastStatus: null,
      lastError: "Namecheap configuration is missing.",
      lastRequestUrl: null,
    });
    throw new Error("Namecheap configuration is missing.");
  }

  return checkDomainsWithNamecheapDirect(targets, config);
}

export async function probeNamecheapProvider(): Promise<void> {
  await checkDomainsWithNamecheap([
    {
      category: "domain_com",
      label: ".com domain",
      value: "example.com",
    },
  ]);
}
