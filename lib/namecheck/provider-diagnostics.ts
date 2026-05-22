export type ProviderDebugState = {
  configured: boolean;
  lastStatus: number | null;
  lastError: string | null;
  lastRequestUrl: string | null;
  lastCheckedAt: string | null;
};

export type ProviderDebugSnapshot = {
  openrouter: ProviderDebugState;
  namecheap: ProviderDebugState;
};

const providerDebugState: ProviderDebugSnapshot = {
  openrouter: {
    configured: false,
    lastStatus: null,
    lastError: null,
    lastRequestUrl: null,
    lastCheckedAt: null,
  },
  namecheap: {
    configured: false,
    lastStatus: null,
    lastError: null,
    lastRequestUrl: null,
    lastCheckedAt: null,
  },
};

function normalizeErrorMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim().slice(0, 500);
}

export function redactUrlSecret(url: string): string {
  const parsedUrl = new URL(url);

  for (const key of parsedUrl.searchParams.keys()) {
    if (/key|token|secret|password/i.test(key)) {
      parsedUrl.searchParams.set(key, "[redacted]");
    }
  }

  return parsedUrl.toString();
}

export function summarizeProviderError(message: string): string {
  const normalized = normalizeErrorMessage(message);
  const lower = normalized.toLowerCase();

  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("invalid api")) {
    return `auth_error: ${normalized}`;
  }

  if (lower.includes("402") || lower.includes("credit") || lower.includes("insufficient")) {
    return `billing_error: ${normalized}`;
  }

  if (lower.includes("404") || lower.includes("model") || lower.includes("not found")) {
    return `not_found_or_model_error: ${normalized}`;
  }

  if (lower.includes("429") || lower.includes("rate limit")) {
    return `rate_limited: ${normalized}`;
  }

  if (lower.includes("clientip") || lower.includes("ip address") || lower.includes("whitelist")) {
    return `ip_whitelist_error: ${normalized}`;
  }

  if (lower.includes("sandbox")) {
    return `sandbox_error: ${normalized}`;
  }

  if (lower.includes("abort") || lower.includes("timeout")) {
    return `timeout_or_network_error: ${normalized}`;
  }

  return normalized;
}

export function recordProviderDebug(
  provider: keyof ProviderDebugSnapshot,
  update: Partial<ProviderDebugState>,
): void {
  providerDebugState[provider] = {
    ...providerDebugState[provider],
    ...update,
    lastError: update.lastError
      ? summarizeProviderError(update.lastError)
      : update.lastError === null
        ? null
        : providerDebugState[provider].lastError,
    lastCheckedAt: update.lastCheckedAt ?? new Date().toISOString(),
  };
}

export function getProviderDebugSnapshot(): ProviderDebugSnapshot {
  return {
    openrouter: { ...providerDebugState.openrouter },
    namecheap: { ...providerDebugState.namecheap },
  };
}
