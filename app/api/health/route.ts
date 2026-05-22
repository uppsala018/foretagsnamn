import { NextResponse } from "next/server";
import { getStripeCheckoutConfig } from "@/lib/stripe";
import { isReportStoreConfigured } from "@/lib/reports/report-store";
import { hasOpenRouterConfig } from "@/lib/namecheck/openrouter-provider";

export async function GET() {
  return NextResponse.json({
    app: "ok",
    stripeConfigured: getStripeCheckoutConfig() !== null,
    firebaseConfigured: isReportStoreConfigured(),
    openrouterConfigured: hasOpenRouterConfig(),
    hostupConfigured: Boolean(process.env.HOSTUP_API_KEY),
  });
}
