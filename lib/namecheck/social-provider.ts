import type { NamecheckResult, NamecheckTarget, ResultStatus } from "./types";

const SOCIAL_TIMEOUT_MS = 4_500;
const USER_AGENT = "Mozilla/5.0 (compatible; ForetagsnamnApp/1.0; +https://foretagsnamn.app)";

function stripHandle(value: string): string {
  return value.trim().replace(/^@+/, "");
}

function profileUrlFor(target: NamecheckTarget): string {
  const handle = encodeURIComponent(stripHandle(target.value));

  if (target.category === "instagram") {
    return `https://www.instagram.com/${handle}/`;
  }

  return `https://www.tiktok.com/@${handle}`;
}

async function fetchWithTimeout(url: string, method: "HEAD" | "GET"): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOCIAL_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function statusForResponse(status: number): {
  status: ResultStatus;
  summary: string;
  warning?: string;
} {
  if (status === 200) {
    return {
      status: "taken",
      summary: "En offentlig profilsida svarade på adressen. Handlet bör behandlas som upptaget.",
    };
  }

  if (status === 404) {
    return {
      status: "available",
      summary: "Den offentliga profilsidan returnerade 404 vid kontrolltillfället.",
    };
  }

  if (status === 403 || status === 429) {
    return {
      status: "uncertain",
      summary: "Kontrollen blockerades eller begränsades av plattformen.",
      warning: "Sociala medier kan blockera automatiska kontroller. Kontrollera alltid manuellt innan beslut.",
    };
  }

  return {
    status: "uncertain",
    summary: "Profilkontrollen gav ett oväntat svar och kan inte verifieras säkert.",
    warning: "Sociala medier kan blockera automatiska kontroller. Kontrollera alltid manuellt innan beslut.",
  };
}

async function checkSocialTarget(target: NamecheckTarget): Promise<NamecheckResult> {
  const checkedUrl = profileUrlFor(target);
  const checkedAt = new Date().toISOString();

  try {
    let response = await fetchWithTimeout(checkedUrl, "HEAD");

    if ([405, 501].includes(response.status)) {
      response = await fetchWithTimeout(checkedUrl, "GET");
    }

    const mapped = statusForResponse(response.status);

    return {
      ...target,
      status: mapped.status,
      summary: mapped.summary,
      details: "Indikativ offentlig profilkontroll. Ingen siddata har skrapats eller analyserats.",
      checkLabel: "Indikativ offentlig profilkontroll",
      source: "public_profile_check",
      metadata: {
        confidence: "indicative",
        checkedUrl,
        checkedAt,
        warning: mapped.warning,
      },
    };
  } catch {
    return {
      ...target,
      status: "uncertain",
      summary: "Profilkontrollen kunde inte slutföras just nu.",
      details: "Indikativ offentlig profilkontroll. Ingen siddata har skrapats eller analyserats.",
      checkLabel: "Indikativ offentlig profilkontroll",
      source: "public_profile_check",
      metadata: {
        confidence: "indicative",
        checkedUrl,
        checkedAt,
        warning: "Sociala medier kan blockera automatiska kontroller. Kontrollera alltid manuellt innan beslut.",
      },
    };
  }
}

export async function checkSocialProfiles(targets: NamecheckTarget[]): Promise<NamecheckResult[]> {
  return Promise.all(targets.map((target) => checkSocialTarget(target)));
}
