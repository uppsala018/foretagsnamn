import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { trackEvent } from "@/lib/analytics";
import { getAdminFirestore, hasFirebaseAdminConfig } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const Stripe = (await import("stripe")).default;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook är inte konfigurerad." }, { status: 503 });
  }

  if (!hasFirebaseAdminConfig()) {
    return NextResponse.json({ error: "Firebase Admin är inte konfigurerat." }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Saknar Stripe-signatur." }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const email = metadata.email || session.customer_details?.email || session.customer_email || null;
    const collection = metadata.type === "domain" ? "domain_orders" : "paid_reports";

    await getAdminFirestore().collection(collection).doc(session.id).set(
      {
        sessionId: session.id,
        stripeSessionId: session.id,
        customerEmail: email,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata,
        query: metadata.query || null,
        product: metadata.product || null,
        status: "completed",
        stripePaymentStatus: session.payment_status,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (metadata.product === "deep_search") {
      await trackEvent("paid_report_completed", {
        email,
        query: metadata.query || null,
        stripeSessionId: session.id,
      });
    }
  }

  return NextResponse.json({ received: true });
}
