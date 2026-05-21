import type { NamecheckResult, NamecheckTarget } from "./types";

const SANDBOX_URL = "https://api.sandbox.namecheap.com/xml.response";
const PRODUCTION_URL = "https://api.namecheap.com/xml.response";

type NamecheapConfig = {
  apiUser: string;
  apiKey: string;
  username: string;
  clientIp: string;
  sandbox: boolean;
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
  return getNamecheapConfig() !== null;
}

export async function checkDomainsWithNamecheap(
  targets: NamecheckTarget[],
): Promise<NamecheckResult[]> {
  const config = getNamecheapConfig();

  if (!config) {
    throw new Error("Namecheap configuration is missing.");
  }

  const endpoint = config.sandbox ? SANDBOX_URL : PRODUCTION_URL;
  const params = new URLSearchParams({
    ApiUser: config.apiUser,
    ApiKey: config.apiKey,
    UserName: config.username,
    ClientIp: config.clientIp,
    Command: "namecheap.domains.check",
    DomainList: targets.map((target) => target.value).join(","),
  });

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Namecheap HTTP status ${response.status}.`);
  }

  const xml = await response.text();
  const parsed = parseNamecheapDomainsCheckResponse(xml);

  if (parsed.errors.length > 0) {
    throw new Error(`Namecheap API error: ${parsed.errors[0]}`);
  }

  return targets.map((target) => {
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
