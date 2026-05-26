import "server-only";

import Stripe from "stripe";

export type StripeCheckoutConfig = {
  priceId: string;
  appUrl: string;
};

export type DeepSearchSessionVerification = {
  paid: boolean;
  query: string | null;
  email: string | null;
  sessionId: string;
  stripePaymentStatus: Stripe.Checkout.Session["payment_status"] | null;
  product: string | null;
};

export function getStripeCheckoutConfig(): StripeCheckoutConfig | null {
  const priceId = process.env.STRIPE_PRICE_DEEP_SEARCH || process.env.STRIPE_PRICE_ID_DEEP_SEARCH;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!process.env.STRIPE_SECRET_KEY || !priceId || !appUrl) {
    return null;
  }

  return {
    priceId,
    appUrl: appUrl.replace(/\/+$/, ""),
  };
}

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Stripe secret key is missing.");
  }

  return new Stripe(secretKey);
}

export async function verifyDeepSearchCheckoutSession(
  sessionId: string,
): Promise<DeepSearchSessionVerification> {
  const safeSessionId = sessionId.slice(0, 120);
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(safeSessionId);
  const product = session.metadata?.product ?? null;
  const paid = session.payment_status === "paid" && product === "deep_search";
  const query = paid && typeof session.metadata?.query === "string"
    ? session.metadata.query
    : null;
  const email = typeof session.metadata?.email === "string"
    ? session.metadata.email
    : session.customer_details?.email ?? session.customer_email ?? null;

  return {
    paid,
    query,
    email,
    sessionId: safeSessionId,
    stripePaymentStatus: session.payment_status,
    product,
  };
}
