import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/analytics";
import { validateNamecheckQuery } from "@/lib/namecheck/validation";
import { getStripeCheckoutConfig, getStripeClient } from "@/lib/stripe";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readField(body: unknown, key: string): string {
  if (typeof body !== "object" || body === null || !(key in body)) return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

async function createCheckoutSession(query: unknown, emailValue: string) {
  const validation = validateNamecheckQuery(query);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const email = emailValue.toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Ange en giltig e-postadress innan betalning." },
      { status: 400 },
    );
  }

  const config = getStripeCheckoutConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Betalning är inte konfigurerad ännu." },
      { status: 503 },
    );
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price: config.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        query: validation.query,
        email,
        product: "deep_search",
        type: "report",
      },
      success_url: `${config.appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/?cancelled=true`,
    });

    await trackEvent("paid_report_started", {
      email,
      query: validation.query,
      stripeSessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.warn(
      "Stripe checkout session creation failed.",
      error instanceof Error ? error.name : "UnknownError",
    );

    return NextResponse.json(
      { error: "Kunde inte starta betalning just nu." },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const email = searchParams.get("email") ?? "";

  if (!query || !email) {
    const config = getStripeCheckoutConfig();
    const appUrl = config?.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "/";
    return NextResponse.redirect(`${appUrl.replace(/\/+$/, "")}/?checkout_error=missing_details`);
  }

  const response = await createCheckoutSession(query, email);
  const payload = response.ok ? await response.clone().json() as { url?: string } : {};

  if (response.ok && payload.url) {
    return NextResponse.redirect(payload.url);
  }

  return response;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 });
  }

  return createCheckoutSession(readField(body, "query"), readField(body, "email"));
}
