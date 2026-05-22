// HostUp integration – använder testnyckel. Byt till live-nyckel senare.
import { NextResponse } from "next/server";

const HOSTUP_AVAILABILITY_URL = "https://cloud.hostup.se/api/v2/domains/availability";
const HOSTUP_TEST_API_KEY = "sk_test_WfZq9OagexY3ON9Ts5iqb0cdwwO7t988";
const MAX_POLL_ATTEMPTS = 15;
const POLL_DELAY_MS = 800;
const MAX_DOMAINS = 20;

type HostUpDomainResult = {
  name: string;
  available: boolean;
  price: number | null;
  currency: string | null;
  canRegister: boolean;
  reason: string | null;
  requirements: string[];
};

type HostUpApiRecord = Record<string, unknown>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRecord(value: unknown): value is HostUpApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDomain(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const domain = value.trim().toLowerCase();

  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) || domain.length > 253) {
    return null;
  }

  return domain;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readRequirements(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractPollUrl(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const pollUrl = readString(payload.pollUrl)
    ?? readString(payload.poll_url)
    ?? readString(payload.url)
    ?? readString(payload.statusUrl)
    ?? readString(payload.status_url);

  if (!pollUrl) {
    return null;
  }

  return new URL(pollUrl, HOSTUP_AVAILABILITY_URL).toString();
}

function extractRecords(payload: unknown): HostUpApiRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = [
    payload.results,
    payload.domains,
    payload.data,
    payload.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  return [];
}

function normalizeHostUpResult(record: HostUpApiRecord, fallbackName: string): HostUpDomainResult {
  const actions = isRecord(record.actions) ? record.actions : null;
  const canRegisterAction = actions && isRecord(actions.canRegister) ? actions.canRegister : null;
  const billing = isRecord(record.billing) ? record.billing : null;
  const pricing = isRecord(record.pricing) ? record.pricing : null;
  const name = readString(record.name)
    ?? readString(record.domain)
    ?? readString(record.fqdn)
    ?? fallbackName;
  const available = Boolean(record.available);
  const canRegister = typeof record.canRegister === "boolean"
    ? record.canRegister
    : typeof record.can_register === "boolean"
      ? record.can_register
      : typeof canRegisterAction?.allowed === "boolean"
        ? canRegisterAction.allowed
        : available;
  const price = readNumber(record.price)
    ?? readNumber(record.registrationPrice)
    ?? readNumber(record.registration_price)
    ?? readNumber(pricing?.price)
    ?? readNumber(billing?.amount);
  const currency = readString(record.currency)
    ?? readString(pricing?.currency)
    ?? readString(billing?.currency)
    ?? (price === null ? null : "SEK");

  return {
    name,
    available,
    price,
    currency,
    canRegister,
    reason: readString(record.reason)
      ?? readString(record.message)
      ?? readString(canRegisterAction?.reason)
      ?? (available ? null : "Domänen är inte tillgänglig."),
    requirements: readRequirements(record.requirements),
  };
}

function normalizeHostUpPayload(payload: unknown, requestedNames: string[]): HostUpDomainResult[] {
  const records = extractRecords(payload);
  const byName = new Map(
    records.map((record, index) => {
      const fallback = requestedNames[index] ?? "";
      const result = normalizeHostUpResult(record, fallback);
      return [result.name.toLowerCase(), result] as const;
    }),
  );

  return requestedNames.map((name, index) => {
    const record = records[index];
    const exact = byName.get(name.toLowerCase());

    if (exact) {
      return exact;
    }

    if (record) {
      return normalizeHostUpResult(record, name);
    }

    return {
      name,
      available: false,
      price: null,
      currency: null,
      canRegister: false,
      reason: "HostUp returnerade inget resultat för domänen.",
      requirements: [],
    };
  });
}

async function hostupFetch(url: string, init?: RequestInit): Promise<Response> {
  const apiKey = process.env.HOSTUP_API_KEY ?? HOSTUP_TEST_API_KEY;

  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("HostUp returnerade ogiltig JSON.");
  }
}

async function resolveHostUpAvailability(names: string[]): Promise<HostUpDomainResult[]> {
  const initialResponse = await hostupFetch(HOSTUP_AVAILABILITY_URL, {
    method: "POST",
    body: JSON.stringify({ names }),
  });
  let payload = await readJson(initialResponse);

  if (initialResponse.status === 202) {
    const pollUrl = extractPollUrl(payload);

    if (!pollUrl) {
      throw new Error("HostUp köade svaret men skickade ingen pollUrl.");
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await delay(POLL_DELAY_MS);

      const pollResponse = await hostupFetch(pollUrl);
      payload = await readJson(pollResponse);

      if (pollResponse.status === 200) {
        return normalizeHostUpPayload(payload, names);
      }

      if (pollResponse.status !== 202) {
        throw new Error(`HostUp polling misslyckades med status ${pollResponse.status}.`);
      }
    }

    throw new Error("HostUp tog för lång tid att returnera domänresultat.");
  }

  if (!initialResponse.ok) {
    throw new Error(`HostUp svarade med status ${initialResponse.status}.`);
  }

  return normalizeHostUpPayload(payload, names);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 });
  }

  const names = isRecord(body) && Array.isArray(body.names)
    ? body.names.map(normalizeDomain).filter((name): name is string => name !== null)
    : [];

  if (names.length === 0) {
    return NextResponse.json(
      { error: "Skicka minst en giltig domän i names." },
      { status: 400 },
    );
  }

  try {
    const uniqueNames = [...new Set(names)].slice(0, MAX_DOMAINS);
    const results = await resolveHostUpAvailability(uniqueNames);

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Kunde inte kontrollera domäner just nu.",
      },
      { status: 502 },
    );
  }
}
