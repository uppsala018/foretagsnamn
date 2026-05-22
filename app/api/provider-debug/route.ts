import { NextResponse } from "next/server";
import {
  getProviderDebugSnapshot,
  recordProviderDebug,
} from "@/lib/namecheck/provider-diagnostics";
import {
  getOpenRouterModel,
  hasOpenRouterConfig,
  probeOpenRouterProvider,
} from "@/lib/namecheck/openrouter-provider";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

function envExists(name: string): boolean {
  return Boolean(process.env[name]);
}

function readEnvPresence() {
  return {
    OPENROUTER_API_KEY: envExists("OPENROUTER_API_KEY"),
    OPENROUTER_MODEL: envExists("OPENROUTER_MODEL"),
    HOSTUP_API_KEY: envExists("HOSTUP_API_KEY"),
  };
}

function refreshConfiguredState() {
  recordProviderDebug("openrouter", { configured: hasOpenRouterConfig() });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldProbe = searchParams.get("probe") === "1";

  refreshConfiguredState();

  if (shouldProbe) {
    await Promise.allSettled([probeOpenRouterProvider()]);
  }

  const snapshot = getProviderDebugSnapshot();

  return NextResponse.json(
    {
      runtime: {
        nodeEnv: process.env.NODE_ENV ?? null,
        vercel: envExists("VERCEL"),
        vercelEnv: process.env.VERCEL_ENV ?? null,
        region: process.env.VERCEL_REGION ?? null,
      },
      env: readEnvPresence(),
      openrouterConfigured: snapshot.openrouter.configured,
      openrouterModel: getOpenRouterModel(),
      openrouterLastStatus: snapshot.openrouter.lastStatus,
      openrouterLastError: snapshot.openrouter.lastError,
      openrouterLastRequestUrl: snapshot.openrouter.lastRequestUrl,
      hostupConfigured: envExists("HOSTUP_API_KEY"),
    },
    {
      headers: NO_STORE_HEADERS,
    },
  );
}
