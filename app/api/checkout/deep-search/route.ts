import { NextResponse } from "next/server";
import { validateNamecheckQuery } from "@/lib/namecheck/validation";
import { getStripeCheckoutConfig, getStripeClient } from "@/lib/stripe";

export async function GET() {
  return NextResponse.json({
    configured: getStripeCheckoutConfig() !== null,
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 });
  }

  const query = typeof body === "object" && body !== null && "query" in body
    ? (body as { query?: unknown }).query
    : undefined;
  const validation = validateNamecheckQuery(query);

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  const config = getStripeCheckoutConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Betalning inte konfigurerad ännu." },
      { status: 503 },
    );
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: config.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        query: validation.query,
        product: "deep_search",
      },
      success_url: `${config.appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/?cancelled=true`,
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
