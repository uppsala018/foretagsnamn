import "server-only";

import {
  recordProviderDebug,
  summarizeProviderError,
} from "./provider-diagnostics";
import type { AiBrandAnalysis, BrandRisk, NamecheckResult } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "tencent/hy3-preview";
const TIMEOUT_MS = 25_000;
const MAX_CONTENT_LENGTH = 8_000;
const MAX_ITEM_LENGTH = 180;

type OpenRouterMessage = {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterMessage[];
};

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

export function hasOpenRouterConfig(): boolean {
  const configured = Boolean(process.env.OPENROUTER_API_KEY);
  recordProviderDebug("openrouter", { configured });
  return configured;
}

function clampText(value: unknown, fallback: string, maxLength = 420): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, MAX_ITEM_LENGTH))
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeRisk(value: unknown): BrandRisk {
  return value === "low" || value === "medium" || value === "high" || value === "uncertain"
    ? value
    : "uncertain";
}

function extractJson(text: string): unknown {
  const clamped = text.slice(0, MAX_CONTENT_LENGTH).trim();

  try {
    return JSON.parse(clamped);
  } catch {
    const start = clamped.indexOf("{");
    const end = clamped.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("OpenRouter returned invalid JSON.");
    }

    return JSON.parse(clamped.slice(start, end + 1));
  }
}

export function normalizeAiBrandAnalysis(payload: unknown): AiBrandAnalysis {
  const data = typeof payload === "object" && payload !== null
    ? payload as Record<string, unknown>
    : {};

  return {
    overallRisk: normalizeRisk(data.overallRisk),
    summary: clampText(
      data.summary,
      "AI-bedömningen kunde inte tolkas fullt ut. Gör en manuell kontroll innan beslut.",
    ),
    strengths: normalizeStringArray(data.strengths),
    warnings: normalizeStringArray(data.warnings),
    suggestedAlternatives: normalizeStringArray(data.suggestedAlternatives),
    legalDisclaimer: clampText(
      data.legalDisclaimer,
      "AI-bedömningen är inte juridisk rådgivning.",
      220,
    ),
  };
}

function readAssistantContent(response: OpenRouterResponse): string {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text)
      .filter((text): text is string => typeof text === "string")
      .join("\n");
  }

  throw new Error("OpenRouter response did not include assistant content.");
}

function buildPrompt(name: string, reportResults: NamecheckResult[]): string {
  const domainAndHandleData = reportResults
    .filter((result) => ["domain_se", "domain_com", "instagram", "tiktok"].includes(result.category))
    .map((result) => ({
      label: result.label,
      value: result.value,
      status: result.status,
      source: result.source,
    }));

  return JSON.stringify({
    task: "Analysera ett föreslaget svenskt företags- eller varumärkesnamn. Returnera endast JSON.",
    name,
    checks: domainAndHandleData,
    criteria: [
      "namnets tydlighet",
      "minnesvärde",
      "svensk stavning och uttal",
      "risk att uppfattas som generiskt",
      "risk att kunna förväxlas med existerande namn utan att påstå registerkunskap",
      "konsekvens mellan namn, domäner och handles",
    ],
    requiredJsonShape: {
      overallRisk: "low | medium | high | uncertain",
      summary: "kort svensk förklaring",
      strengths: ["string"],
      warnings: ["string"],
      suggestedAlternatives: ["string"],
      legalDisclaimer: "AI-bedömningen är inte juridisk rådgivning.",
    },
  });
}

export async function analyzeBrandNameWithOpenRouter(
  name: string,
  reportResults: NamecheckResult[],
): Promise<AiBrandAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  let recordedHttpError = false;

  if (!apiKey) {
    recordProviderDebug("openrouter", {
      configured: false,
      lastStatus: null,
      lastError: "OpenRouter configuration is missing.",
      lastRequestUrl: OPENROUTER_URL,
    });
    throw new Error("OpenRouter configuration is missing.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    recordProviderDebug("openrouter", {
      configured: true,
      lastStatus: null,
      lastError: null,
      lastRequestUrl: OPENROUTER_URL,
    });

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getOpenRouterModel(),
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content:
              "Du är en svensk varumärkes- och namnriskassistent. Du får inte påstå att du har kontrollerat Bolagsverket, varumärkesregister eller sociala plattformar. Returnera strikt JSON.",
          },
          {
            role: "user",
            content: buildPrompt(name, reportResults),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `OpenRouter HTTP status ${response.status}. ${errorText.slice(0, 500)}`;
      recordProviderDebug("openrouter", {
        configured: true,
        lastStatus: response.status,
        lastError: errorMessage,
        lastRequestUrl: OPENROUTER_URL,
      });
      recordedHttpError = true;
      console.warn("OpenRouter provider failed.", {
        status: response.status,
        error: summarizeProviderError(errorMessage),
      });
      throw new Error(errorMessage);
    }

    recordProviderDebug("openrouter", {
      configured: true,
      lastStatus: response.status,
      lastError: null,
      lastRequestUrl: OPENROUTER_URL,
    });

    const payload = await response.json() as OpenRouterResponse;
    const content = readAssistantContent(payload);

    return normalizeAiBrandAnalysis(extractJson(content));
  } catch (error) {
    if (error instanceof Error && !recordedHttpError) {
      recordProviderDebug("openrouter", {
        configured: true,
        lastStatus: null,
        lastError: error.message,
        lastRequestUrl: OPENROUTER_URL,
      });
      console.warn("OpenRouter provider failed.", {
        status: null,
        error: summarizeProviderError(error.message),
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeOpenRouterProvider(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    recordProviderDebug("openrouter", {
      configured: false,
      lastStatus: null,
      lastError: "OpenRouter configuration is missing.",
      lastRequestUrl: OPENROUTER_URL,
    });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getOpenRouterModel(),
        temperature: 0,
        max_tokens: 80,
        messages: [
          {
            role: "user",
            content: "Returnera endast JSON: {\"ok\":true}",
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `OpenRouter HTTP status ${response.status}. ${errorText.slice(0, 500)}`;
      recordProviderDebug("openrouter", {
        configured: true,
        lastStatus: response.status,
        lastError: errorMessage,
        lastRequestUrl: OPENROUTER_URL,
      });
      console.warn("OpenRouter provider probe failed.", {
        status: response.status,
        error: summarizeProviderError(errorMessage),
      });
      return;
    }

    recordProviderDebug("openrouter", {
      configured: true,
      lastStatus: response.status,
      lastError: null,
      lastRequestUrl: OPENROUTER_URL,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown OpenRouter network error.";
    recordProviderDebug("openrouter", {
      configured: true,
      lastStatus: null,
      lastError: errorMessage,
      lastRequestUrl: OPENROUTER_URL,
    });
    console.warn("OpenRouter provider probe failed.", {
      status: null,
      error: summarizeProviderError(errorMessage),
    });
  } finally {
    clearTimeout(timeout);
  }
}
