import { NextResponse } from "next/server";
import { getStripeCheckoutConfig } from "@/lib/stripe";
import { isReportStoreConfigured } from "@/lib/reports/report-store";
import { hasOpenRouterConfig } from "@/lib/namecheck/openrouter-provider";
import { hasNamecheapConfig } from "@/lib/namecheck/namecheap-provider";

export async function GET() {
  return NextResponse.json({
    app: "ok",
    stripeConfigured: getStripeCheckoutConfig() !== null,
    firebaseConfigured: isReportStoreConfigured(),
    openrouterConfigured: hasOpenRouterConfig(),
    namecheapConfigured: hasNamecheapConfig(),
  });
}
